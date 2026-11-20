import { container } from "@sapphire/framework";
import type { Guild, User } from "discord.js";
import { DBManager, type ModLogType } from "./database";
import { renderMessage, serverContext, userContext } from "./messages";
import { formatDuration, registerTask, schedule } from "./scheduler";
import { Colors, VortexEmbed } from "./structures/embed";

export const MOD_LABELS: Record<ModLogType, { label: string; color: number }> = {
    warn: { label: "Warn", color: Colors.warning },
    kick: { label: "Kick", color: Colors.orange },
    ban: { label: "Ban", color: Colors.danger },
    tempban: { label: "Temporary ban", color: Colors.danger },
    softban: { label: "Softban", color: Colors.orange },
    unban: { label: "Unban", color: Colors.success },
    timeout: { label: "Timeout", color: Colors.orange },
    untimeout: { label: "Timeout removed", color: Colors.success },
    deafen: { label: "Deafen", color: Colors.muted },
    undeafen: { label: "Undeafen", color: Colors.muted },
    automod: { label: "Auto-mod", color: Colors.brand }
};

// Actions the member is told about by DM (when the server has that on).
const DM_TYPES = new Set<ModLogType>(["warn", "timeout", "kick", "ban", "tempban", "softban"]);
const BAN_TYPES = new Set<ModLogType>(["ban", "tempban", "softban"]);

export interface ModAction {
    type: ModLogType;
    moderator: User;
    target: User;
    reason: string;
    // For timeouts and temp bans.
    durationMs?: number;
}

// Records a moderation action and posts it to the server's mod-log channel (if set in the dashboard).
// For warnings, also applies the server's warning thresholds (e.g. 3 warns → timeout).
// Returns the case number. Posting failures never break the command that called this.
export async function logModAction(guild: Guild, entry: ModAction) {
    const reason = entry.durationMs ? `${entry.reason} (${formatDuration(entry.durationMs)})` : entry.reason;

    const caseId = await DBManager.addModLog({
        guildId: guild.id,
        type: entry.type,
        moderatorId: entry.moderator.id,
        targetId: entry.target.id,
        reason
    });

    await postToModLog(guild, entry, caseId).catch((error) => container.logger.warn(`Mod log post failed in ${guild.id}:`, error));

    if (entry.type === "warn") await applyWarnThresholds(guild, entry.target).catch((error) => container.logger.warn(`Warn thresholds failed in ${guild.id}:`, error));
    return caseId;
}

async function postToModLog(guild: Guild, entry: ModAction, caseId: number) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    if (!settings.modLog.enabled || !settings.modLog.channelId) return;

    const channel = guild.channels.cache.get(settings.modLog.channelId) ?? await guild.channels.fetch(settings.modLog.channelId).catch(() => null);
    if (!channel?.isSendable()) return;

    const { label, color } = MOD_LABELS[entry.type];
    const embed = new VortexEmbed(guild.id)
        .setColor(color)
        .setTitle(`${label} · Case #${caseId}`)
        .setThumbnail(entry.target.displayAvatarURL())
        .addField("User", `${entry.target} (${entry.target.tag})`, true)
        .addField("Moderator", `${entry.moderator}`, true);

    if (entry.durationMs) embed.addField("Duration", formatDuration(entry.durationMs), true);
    embed.addField("Reason", entry.reason.slice(0, 1024)).setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}

// Tells the member what happened to them, using the server's DM template (Moderation settings).
// Bans also get the appeal message. Must run BEFORE a kick or ban: Discord won't deliver DMs from
// a bot you no longer share a server with. Returns whether a DM went out.
export async function notifyTarget(guild: Guild, entry: ModAction) {
    if (entry.target.bot || !DM_TYPES.has(entry.type)) return false;
    const { settings } = await DBManager.getGuildConfig(guild.id);
    const ctx = {
        user: userContext(entry.target),
        server: serverContext(guild),
        extra: {
            action: MOD_LABELS[entry.type].label.toLowerCase(),
            reason: entry.reason,
            duration: entry.durationMs ? formatDuration(entry.durationMs) : "permanent",
            moderator: entry.moderator.username
        }
    };

    const messages = [];
    if (settings.moderation.dmOnAction) messages.push(renderMessage(settings.moderation.dmMessage, ctx, guild.id));
    if (BAN_TYPES.has(entry.type) && entry.type !== "softban" && settings.appeals.enabled) messages.push(renderMessage(settings.appeals.message, ctx, guild.id));

    let sent = false;
    for (const payload of messages) {
        sent = (await entry.target.send(payload).then(() => true, () => false)) || sent;
    }
    return sent;
}

// Checks the member's warning count against the server's thresholds and applies the matching
// punishment. Thresholds trigger exactly when the count reaches them, so each fires once.
// Warnings older than the server's expiry don't count.
async function applyWarnThresholds(guild: Guild, target: User) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    if (!settings.warnThresholds.length) return;

    const count = await DBManager.countModLogs(guild.id, target.id, "warn", settings.moderation.warnExpiryDays);
    const rule = settings.warnThresholds.find((t) => t.count === count);
    if (!rule) return;

    const me = guild.client.user;
    const reason = `Reached ${count} warnings`;
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (rule.action === "timeout") {
        if (!member?.moderatable) return;
        const durationMs = rule.durationMinutes * 60_000;
        await notifyTarget(guild, { type: "timeout", moderator: me, target, reason, durationMs });
        await member.timeout(durationMs, reason);
        await logModAction(guild, { type: "timeout", moderator: me, target, reason, durationMs });
    } else if (rule.action === "kick") {
        if (!member?.kickable) return;
        await notifyTarget(guild, { type: "kick", moderator: me, target, reason });
        await member.kick(reason);
        await logModAction(guild, { type: "kick", moderator: me, target, reason });
    } else if (rule.action === "ban") {
        if (member && !member.bannable) return;
        await notifyTarget(guild, { type: "ban", moderator: me, target, reason });
        await guild.bans.create(target.id, { reason });
        await logModAction(guild, { type: "ban", moderator: me, target, reason });
    }
}

// Schedules the automatic unban for /tempban.
export async function scheduleUnban(guild: Guild, user: User, durationMs: number, moderator: User) {
    await schedule({
        type: "unban",
        guildId: guild.id,
        runAt: new Date(Date.now() + durationMs),
        payload: { userId: user.id, moderatorId: moderator.id },
        createdBy: moderator.id
    });
}

registerTask("unban", async (task) => {
    const { userId } = task.payload as { userId: string };
    const guild = container.client.guilds.cache.get(task.guildId ?? "");
    if (!guild) return;

    // Already unbanned by hand? Nothing to do.
    const ban = await guild.bans.fetch(userId).catch(() => null);
    if (!ban) return;

    await guild.bans.remove(userId, "Temporary ban expired");
    await logModAction(guild, { type: "unban", moderator: container.client.user!, target: ban.user, reason: "Temporary ban expired" });
});
