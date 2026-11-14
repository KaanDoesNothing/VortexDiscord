import { container } from "@sapphire/framework";
import type { EmbedBuilder, Guild } from "discord.js";
import { DBManager } from "./database";
import type { GuildSettings } from "./settings";

export type LogKind = keyof GuildSettings["logs"];

// Posts an embed to the server's log channel for this kind of event (set in the dashboard).
// Does nothing if that log is off. Never throws: logging must not break anything else.
export async function sendLog(guild: Guild, kind: LogKind, embed: EmbedBuilder) {
    try {
        const { settings } = await DBManager.getGuildConfig(guild.id);
        const channelId = settings.logs[kind];
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId) ?? await guild.channels.fetch(channelId).catch(() => null);
        if (!channel?.isSendable()) return;

        await channel.send({ embeds: [embed.setTimestamp()], allowedMentions: { parse: [] } });
    } catch (error) {
        container.logger.debug(`Event log (${kind}) failed in ${guild.id}:`, error);
    }
}

// Discord field values max out at 1024 characters.
export const clip = (text: string, max = 1000) => (text.length > max ? `${text.slice(0, max)}…` : text) || "*(empty)*";
