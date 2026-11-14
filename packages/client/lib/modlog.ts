import { container } from "@sapphire/framework";
import type { Guild, User } from "discord.js";
import { DBManager, type ModLogType } from "./database";
import { renderTemplate } from "./settings";
import { formatDuration, registerTask, schedule } from "./scheduler";
import { VortexEmbed } from "./structures/embed";

const LABELS: Record<ModLogType, { label: string; color: number }> = {
    warn: { label: "Warn", color: 0xf5c542 },
    kick: { label: "Kick", color: 0xf28c28 },
    ban: { label: "Ban", color: 0xe5484d },
    tempban: { label: "Temporary ban", color: 0xe5484d },
    unban: { label: "Unban", color: 0x30a46c },
    timeout: { label: "Timeout", color: 0xf28c28 },
    untimeout: { label: "Timeout removed", color: 0x30a46c },
    deafen: { label: "Deafen", color: 0x8e8c99 },
    undeafen: { label: "Undeafen", color: 0x8e8c99 },
    automod: { label: "Auto-mod", color: 0x6d6af0 }
};

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
// Posting failures (missing channel/permissions) never break the command that called this.
export async function logModAction(guild: Guild, entry: ModAction) {
    const reason = entry.durationMs ? `${entry.reason} (${formatDuration(entry.durationMs)})` : entry.reason;

    await DBManager.addModLog({
        guildId: guild.id,
        type: entry.type,
        moderatorId: entry.moderator.id,
        targetId: entry.target.id,
        reason
    });

    await postToModLog(guild, entry).catch((error) => container.logger.warn(`Mod log post failed in ${guild.id}:`, error));

    if (entry.type === "warn") await applyWarnThresholds(guild, entry.target).catch((error) => container.logger.warn(`Warn thresholds failed in ${guild.id}:`, error));
}

async function postToModLog(guild: Guild, entry: ModAction) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    if (!settings.modLog.enabled || !settings.modLog.channelId) return;

    const channel = await guild.channels.fetch(settings.modLog.channelId).catch(() => null);
    if (!channel?.isSendable()) return;

    const { label, color } = LABELS[entry.type];
    const embed = new VortexEmbed()
        .setColor(color)
        .setTitle(label)
        .setThumbnail(entry.target.displayAvatarURL())
        .addField("User", `${entry.target} (${entry.target.tag})`, true)
        .addField("Moderator", `${entry.moderator}`, true);

    if (entry.durationMs) embed.addField("Duration", formatDuration(entry.durationMs), true);
    embed.addField("Reason", entry.reason.slice(0, 1024)).setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}

// Checks the member's warning count against the server's thresholds and applies the matching
// punishment. Thresholds trigger exactly when the count reaches them, so each fires once.
async function applyWarnThresholds(guild: Guild, target: User) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    if (!settings.warnThresholds.length) return;

    const count = await DBManager.countModLogs(guild.id, target.id, "warn");
    const rule = settings.warnThresholds.find((t) => t.count === count);
    if (!rule) return;

    const me = guild.client.user;
    const reason = `Reached ${count} warnings`;
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (rule.action === "timeout") {
        if (!member?.moderatable) return;
        const durationMs = rule.durationMinutes * 60_000;
        await member.timeout(durationMs, reason);
        await logModAction(guild, { type: "timeout", moderator: me, target, reason, durationMs });
    } else if (rule.action === "kick") {
        if (!member?.kickable) return;
        await member.kick(reason);
        await logModAction(guild, { type: "kick", moderator: me, target, reason });
    } else if (rule.action === "ban") {
        if (member && !member.bannable) return;
        await sendAppealDm(guild, target);
        await guild.bans.create(target.id, { reason });
        await logModAction(guild, { type: "ban", moderator: me, target, reason });
    }
}

// DMs a user who's about to be banned with the server's appeal message, if enabled.
// Must run before the ban: Discord won't deliver DMs from a bot you no longer share a server with.
export async function sendAppealDm(guild: Guild, user: User) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    if (!settings.appeals.enabled || user.bot) return false;

    const content = renderTemplate(settings.appeals.message, {
        user: { id: user.id, username: user.username, displayName: user.displayName },
        server: { name: guild.name, memberCount: guild.memberCount }
    });

    return user.send({ content }).then(() => true, () => false);
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
