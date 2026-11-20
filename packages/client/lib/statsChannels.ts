import { container } from "@sapphire/framework";
import { ChannelType, type Guild } from "discord.js";
import { DBManager } from "./database";

// Stats channels (Dashboard → Utility → Stats channels): channels whose names show live server
// numbers, e.g. "Members: 1,234". Discord only allows renaming a channel twice per 10 minutes,
// so they're refreshed every 10 minutes and only renamed when the text actually changed.

const INTERVAL_MS = 10 * 60_000;

export const STAT_PLACEHOLDERS = {
    "{memberCount}": "Everyone in the server",
    "{humans}": "Members who aren't bots (needs the Server Members intent)",
    "{bots}": "Bots (needs the Server Members intent)",
    "{online}": "Members online right now (approximate)",
    "{boosts}": "Server boosts",
    "{boostTier}": "Boost level (0-3)",
    "{channels}": "Number of channels",
    "{roles}": "Number of roles"
} as const;

export async function renderStats(guild: Guild, template: string) {
    const needsOnline = template.includes("{online}");
    // Online counts only come from Discord's REST API (with_counts).
    const fresh = needsOnline ? await container.client.guilds.fetch({ guild: guild.id, withCounts: true, force: true }).catch(() => null) : null;
    const members = guild.members.cache;
    const bots = members.filter((m) => m.user.bot).size;
    // Without the Server Members intent the member cache is partial; then humans ≈ total.
    const fullCache = members.size >= guild.memberCount * 0.9;

    const values: Record<string, string> = {
        "{memberCount}": guild.memberCount.toLocaleString("en-US"),
        "{humans}": (fullCache ? guild.memberCount - bots : guild.memberCount).toLocaleString("en-US"),
        "{bots}": (fullCache ? bots : 0).toLocaleString("en-US"),
        "{online}": (fresh?.approximatePresenceCount ?? 0).toLocaleString("en-US"),
        "{boosts}": (guild.premiumSubscriptionCount ?? 0).toLocaleString("en-US"),
        "{boostTier}": String(guild.premiumTier),
        "{channels}": guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).size.toLocaleString("en-US"),
        "{roles}": (guild.roles.cache.size - 1).toLocaleString("en-US")
    };
    return template.replace(/\{\w+\}/g, (m) => values[m] ?? m).slice(0, 100);
}

export async function updateStatsChannels(guild: Guild) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    for (const entry of settings.statsChannels) {
        const channel = guild.channels.cache.get(entry.channelId);
        if (!channel || !("setName" in channel)) continue;
        const name = await renderStats(guild, entry.template);
        if (name && name !== channel.name) await channel.setName(name, "Stats channel update").catch(() => null);
    }
}

async function tick() {
    for (const guild of container.client.guilds.cache.values()) {
        const { settings } = await DBManager.getGuildConfig(guild.id);
        if (settings.statsChannels.length) await updateStatsChannels(guild).catch(() => null);
    }
}

export function startStatsChannels() {
    setInterval(() => void tick(), INTERVAL_MS).unref();
    setTimeout(() => void tick(), 30_000).unref();
}
