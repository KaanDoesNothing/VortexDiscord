import { container } from "@sapphire/framework";
import { ChannelType, OverwriteType, type Guild, type GuildMember, type VoiceBasedChannel, type VoiceState } from "discord.js";
import { eq } from "drizzle-orm";
import { DBManager } from "./database";
import { db } from "./database/client";
import { tempVoiceChannels } from "./database/schema";
import { memberContext } from "./messages";
import { renderTemplate } from "./settings";

// "Join to create" voice channels (Dashboard → Engagement → Temp voice).
//
// Joining a hub channel creates a new voice channel named after the member, moves them in and lets
// them manage it (/voice rename, limit, lock...). The channel is deleted once everyone has left.
// Created channels are stored, so ones left over from a restart are cleaned up too.

const owners = new Map<string, string>(); // channelId → ownerId
let loaded = false;

async function ensureLoaded() {
    if (loaded) return;
    for (const row of await db.select().from(tempVoiceChannels)) owners.set(row.channelId, row.ownerId);
    loaded = true;
}

export const tempChannelOwner = (channelId: string) => owners.get(channelId) ?? null;

export async function onVoiceUpdate(before: VoiceState, after: VoiceState) {
    await ensureLoaded();

    // Left (or moved out of) a temp channel: delete it if it's now empty.
    if (before.channelId && before.channelId !== after.channelId && owners.has(before.channelId)) {
        const channel = before.channel;
        if (!channel || channel.members.filter((m) => !m.user.bot).size === 0) await removeTempChannel(before.guild, before.channelId);
    }

    // Joined a hub: create their channel.
    if (!after.channelId || after.channelId === before.channelId || !after.member || after.member.user.bot) return;
    const { settings } = await DBManager.getGuildConfig(after.guild.id);
    const rules = settings.tempVoice;
    if (!rules.enabled || !rules.hubChannelIds.includes(after.channelId)) return;

    await createFor(after.member, after.channel!, rules).catch((error) => container.logger.debug(`Temp voice failed in ${after.guild.id}:`, error));
}

async function createFor(member: GuildMember, hub: VoiceBasedChannel, rules: { categoryId: string | null; nameTemplate: string; userLimit: number }) {
    const guild = member.guild;
    // One temp channel per member: move them back to their existing one.
    for (const [channelId, ownerId] of owners) {
        if (ownerId !== member.id) continue;
        const existing = guild.channels.cache.get(channelId);
        if (existing?.isVoiceBased()) return member.voice.setChannel(existing).catch(() => null);
    }

    const parent = rules.categoryId && guild.channels.cache.get(rules.categoryId)?.type === ChannelType.GuildCategory ? rules.categoryId : hub.parentId;
    const name = renderTemplate(rules.nameTemplate, memberContext(member)).slice(0, 100) || `${member.displayName}'s channel`;

    // Without explicit overwrites the channel starts with its category's permissions.
    const channel = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: parent ?? undefined,
        userLimit: rules.userLimit,
        bitrate: hub.bitrate,
        reason: `Temp voice channel for ${member.user.tag}`
    });
    // The owner can manage their channel (rename, limit, kick people) from Discord's own menu too.
    await channel.permissionOverwrites.edit(member.id, { ManageChannels: true, MoveMembers: true, Connect: true, ViewChannel: true }, { type: OverwriteType.Member }).catch(() => null);

    owners.set(channel.id, member.id);
    await db.insert(tempVoiceChannels).values({ channelId: channel.id, guildId: guild.id, ownerId: member.id }).onConflictDoNothing();
    // If they already left the hub before the channel was ready, clean up.
    const moved = await member.voice.setChannel(channel).then(() => true, () => false);
    if (!moved) await removeTempChannel(guild, channel.id);
}

async function removeTempChannel(guild: Guild, channelId: string) {
    owners.delete(channelId);
    await db.delete(tempVoiceChannels).where(eq(tempVoiceChannels.channelId, channelId)).catch(() => null);
    await guild.channels.cache.get(channelId)?.delete("Temp voice channel empty").catch(() => null);
}

export async function setTempOwner(channelId: string, ownerId: string) {
    owners.set(channelId, ownerId);
    await db.update(tempVoiceChannels).set({ ownerId }).where(eq(tempVoiceChannels.channelId, channelId));
}

// On startup: delete temp channels that emptied (or vanished) while the bot was offline.
export async function cleanupTempChannels() {
    await ensureLoaded();
    for (const channelId of [...owners.keys()]) {
        const channel = container.client.channels.cache.get(channelId);
        if (!channel) {
            // Not cached: the bot may not be in that server anymore, or the channel is gone.
            owners.delete(channelId);
            await db.delete(tempVoiceChannels).where(eq(tempVoiceChannels.channelId, channelId)).catch(() => null);
            continue;
        }
        if (channel.isVoiceBased() && channel.members.filter((m) => !m.user.bot).size === 0) await removeTempChannel(channel.guild, channelId);
    }
}
