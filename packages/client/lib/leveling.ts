import { container } from "@sapphire/framework";
import { ChannelType, type Guild, type GuildMember } from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import { DBManager } from "./database";
import { db } from "./database/client";
import { guildMembers } from "./database/schema";
import { memberContext, renderMessage } from "./messages";
import type { GuildSettings } from "./settings";

// XP leveling.
//
// Members earn random XP per message (with a cooldown) and per minute in voice, scaled by the
// server's role/channel multipliers. XP isn't written on every message: it's added up in memory and
// saved in one query every FLUSH_MS. Level-ups are detected when a batch is saved, so the
// announcement can come a few seconds after the message that earned it.

type Leveling = GuildSettings["leveling"];

// ---------- The level curve ----------

// XP needed to go from `level` to `level + 1` (before difficulty): 5n² + 50n + 100, like most bots.
// Levels start at 1. difficulty is a percentage (200 = twice as much XP per level).
const rawTotal = (level: number) => {
    const m = level - 1;
    return (5 * m * (m + 1) * (2 * m + 1)) / 6 + 25 * m * (m + 1) + 100 * m;
};

// Total XP needed to reach `level`.
export const xpForLevel = (level: number, difficulty = 100) => Math.round((rawTotal(Math.max(1, level)) * difficulty) / 100);

export function levelFromXp(xp: number, difficulty = 100) {
    let level = 1;
    while (level < 10_000 && xp >= xpForLevel(level + 1, difficulty)) level++;
    return level;
}

// Where a member is within their current level, for rank cards and /rank.
export function levelProgress(xp: number, difficulty = 100) {
    const level = levelFromXp(xp, difficulty);
    const start = xpForLevel(level, difficulty);
    const next = xpForLevel(level + 1, difficulty);
    return { level, current: xp - start, needed: next - start, progress: (xp - start) / (next - start) };
}

// ---------- Earning XP ----------

// XP multiplier (percent) for a member in a channel: highest role multiplier × channel multiplier.
export function multiplierFor(member: GuildMember, channelId: string | null, parentId: string | null, rules: Leveling) {
    if (rules.noXpRoleIds.some((id) => member.roles.cache.has(id))) return 0;

    const roles = rules.roleMultipliers.filter((m) => member.roles.cache.has(m.roleId)).map((m) => m.percent);
    const role = roles.length ? Math.max(...roles) : 100;
    const channelRule = rules.channelMultipliers.find((m) => m.channelId === channelId) ?? rules.channelMultipliers.find((m) => m.channelId === parentId);
    const channel = channelRule?.percent ?? 100;
    return (role * channel) / 100;
}

export const randomXp = (rules: Leveling) => {
    const [min, max] = rules.xpMin <= rules.xpMax ? [rules.xpMin, rules.xpMax] : [rules.xpMax, rules.xpMin];
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

interface Pending { guildId: string; userId: string; xp: number; messages: number; voiceMinutes: number; channelId: string | null }

const FLUSH_MS = 10_000;
const pending = new Map<string, Pending>();

// Queues XP for a member; saved with the next batch.
export function addXp(guildId: string, userId: string, xp: number, extra: { messages?: number; voiceMinutes?: number; channelId?: string | null } = {}) {
    const key = `${guildId}:${userId}`;
    const entry = pending.get(key) ?? { guildId, userId, xp: 0, messages: 0, voiceMinutes: 0, channelId: null };
    entry.xp += Math.max(0, Math.round(xp));
    entry.messages += extra.messages ?? 0;
    entry.voiceMinutes += extra.voiceMinutes ?? 0;
    if (extra.channelId) entry.channelId = extra.channelId;
    pending.set(key, entry);
}

// Saves all queued XP in one upsert per 500 members, then handles anyone who leveled up.
export async function flushXp() {
    if (!pending.size) return;
    const batch = [...pending.values()];
    pending.clear();

    for (let i = 0; i < batch.length; i += 500) {
        const chunk = batch.slice(i, i + 500);
        let rows: { guildId: string; userId: string; xp: number; level: number }[];
        try {
            rows = await db.insert(guildMembers)
                .values(chunk.map((p) => ({ guildId: p.guildId, userId: p.userId, xp: p.xp, messages: p.messages, voiceMinutes: p.voiceMinutes, level: 1 })))
                .onConflictDoUpdate({
                    target: [guildMembers.guildId, guildMembers.userId],
                    set: {
                        xp: sql`${guildMembers.xp} + excluded.xp`,
                        messages: sql`${guildMembers.messages} + excluded.messages`,
                        voiceMinutes: sql`${guildMembers.voiceMinutes} + excluded.voice_minutes`
                    }
                })
                .returning({ guildId: guildMembers.guildId, userId: guildMembers.userId, xp: guildMembers.xp, level: guildMembers.level });
        } catch (error) {
            container.logger.error("Leveling: couldn't save XP:", error);
            continue;
        }

        const channels = new Map(chunk.map((p) => [`${p.guildId}:${p.userId}`, p.channelId]));
        for (const row of rows) {
            const { settings } = await DBManager.getGuildConfig(row.guildId);
            const level = levelFromXp(row.xp, settings.leveling.difficulty);
            if (level <= row.level) continue;

            // Remember the new level first so it's announced exactly once.
            await db.update(guildMembers).set({ level })
                .where(and(eq(guildMembers.guildId, row.guildId), eq(guildMembers.userId, row.userId)));
            await onLevelUp(row.guildId, row.userId, level, row.xp, channels.get(`${row.guildId}:${row.userId}`) ?? null, settings.leveling)
                .catch((error) => container.logger.debug(`Leveling: level-up handling failed in ${row.guildId}:`, error));
        }
    }
}

// ---------- Level-ups ----------

async function onLevelUp(guildId: string, userId: string, level: number, xp: number, channelId: string | null, rules: Leveling) {
    const guild = container.client.guilds.cache.get(guildId);
    if (!guild) return;
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    await applyLevelRewards(member, level, rules.rewards, rules.stackRewards).catch(() => null);
    if (!rules.announce) return;

    const payload = renderMessage(rules.message, memberContext(member, { level, xp, channelId: channelId ?? undefined }), guildId);
    if (rules.announceDm) {
        await member.send(payload).catch(() => null);
        return;
    }

    // Voice XP has no channel to reply in; then only announce if a channel is set.
    const targetId = rules.announceChannelId ?? channelId;
    const channel = targetId ? guild.channels.cache.get(targetId) : null;
    if (!channel?.isSendable()) return;
    await channel.send({ ...payload, allowedMentions: { users: [userId] } }).catch(() => null);
}

// Gives the member every reward role for levels they've reached. With stacking off, only the highest
// earned reward role is kept and lower ones are removed. Skips roles the bot isn't allowed to manage.
export async function applyLevelRewards(member: GuildMember, level: number, rewards: { level: number; roleId: string }[], stack: boolean) {
    if (!rewards.length) return;

    const manageable = (id: string) => {
        const role = member.guild.roles.cache.get(id);
        return role && role.editable && !role.managed;
    };

    const earned = rewards.filter((r) => r.level <= level && manageable(r.roleId)).sort((a, b) => a.level - b.level);
    const unearned = rewards.filter((r) => r.level > level && manageable(r.roleId)).map((r) => r.roleId);

    const keep = stack ? earned.map((r) => r.roleId) : earned.length ? [earned.at(-1)!.roleId] : [];
    // Lower rewards (when not stacking) and rewards above their level (after an XP reset) are removed.
    const remove = [...(stack ? [] : earned.slice(0, -1).map((r) => r.roleId)), ...unearned]
        .filter((id) => !keep.includes(id) && member.roles.cache.has(id));
    const add = keep.filter((id) => !member.roles.cache.has(id));

    if (add.length) await member.roles.add(add, `Level ${level} reward`);
    if (remove.length) await member.roles.remove(remove, "Level reward no longer earned");
}

// ---------- Voice XP ----------

// Once a minute: every member in a voice channel (not AFK, and per the server's rules not alone or
// muted) gets that server's voice XP.
async function voiceTick() {
    for (const guild of container.client.guilds.cache.values()) {
        if (!guild.voiceStates.cache.size) continue;
        const { settings } = await DBManager.getGuildConfig(guild.id);
        const rules = settings.leveling;
        if (!rules.enabled || !rules.voice.enabled) continue;
        awardVoiceXp(guild, rules);
    }
}

function awardVoiceXp(guild: Guild, rules: Leveling) {
    for (const channel of guild.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;
        if (channel.id === guild.afkChannelId || rules.ignoredChannelIds.includes(channel.id)) continue;

        const humans = channel.members.filter((m) => !m.user.bot);
        if (rules.voice.requireOthers && humans.size < 2) continue;

        for (const member of humans.values()) {
            const v = member.voice;
            if (rules.voice.ignoreMuted && (v.selfMute || v.selfDeaf || v.serverMute || v.serverDeaf)) continue;
            const multiplier = multiplierFor(member, channel.id, channel.parentId, rules);
            if (multiplier <= 0) continue;
            addXp(guild.id, member.id, (rules.voice.xpPerMinute * multiplier) / 100, { voiceMinutes: 1 });
        }
    }
}

// ---------- Admin ----------

// Sets a member's XP outright (for /xp set, add, remove and reset). Returns the new XP.
export async function setXp(guildId: string, userId: string, change: { set?: number; add?: number }) {
    await flushXp();
    const value = change.set !== undefined ? sql`${Math.max(0, change.set)}` : sql`GREATEST(0, ${guildMembers.xp} + ${change.add ?? 0})`;
    const [row] = await db.insert(guildMembers)
        .values({ guildId, userId, xp: Math.max(0, change.set ?? change.add ?? 0), messages: 0, level: 1 })
        .onConflictDoUpdate({ target: [guildMembers.guildId, guildMembers.userId], set: { xp: value } })
        .returning({ xp: guildMembers.xp });

    // Keep the "announced level" in line so lowering XP doesn't block future announcements.
    const { settings } = await DBManager.getGuildConfig(guildId);
    const level = levelFromXp(row!.xp, settings.leveling.difficulty);
    await db.update(guildMembers).set({ level }).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
    return { xp: row!.xp, level };
}

// Wipes every member's XP on a server. Returns how many members were reset.
export async function resetAllXp(guildId: string) {
    await flushXp();
    const rows = await db.update(guildMembers).set({ xp: 0, level: 1, messages: 0, voiceMinutes: 0 })
        .where(eq(guildMembers.guildId, guildId)).returning({ userId: guildMembers.userId });
    return rows.length;
}

// ---------- Lifecycle ----------

let timers: Timer[] = [];

export function startLeveling() {
    if (timers.length) return;
    timers = [
        setInterval(() => void flushXp(), FLUSH_MS),
        setInterval(() => void voiceTick().catch((error) => container.logger.warn("Voice XP failed:", error)), 60_000)
    ];
    for (const t of timers) t.unref();
}

// Saves whatever is still queued (called on shutdown).
export async function stopLeveling() {
    for (const t of timers) clearInterval(t);
    timers = [];
    await flushXp();
}
