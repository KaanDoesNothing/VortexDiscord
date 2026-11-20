import { container } from "@sapphire/framework";
import { Status, version as djsVersion } from "discord.js";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import os from "node:os";
import { db, tables } from "../database";
import { musicNodeStatus } from "../music/manager";

// Bot-wide statistics for the public Stats page and the owner panel. Cached for 30 seconds.

let cached: { at: number; value: Awaited<ReturnType<typeof compute>> } | null = null;

export async function getBotStats() {
    if (cached && Date.now() - cached.at < 30_000) return cached.value;
    const value = await compute();
    cached = { at: Date.now(), value };
    return value;
}

async function compute() {
    const { client, stores } = container;
    const guilds = client.guilds.cache;

    // Per-shard numbers. With internal sharding every shard lives in this process.
    const shards = [...client.ws.shards.values()].map((shard) => {
        const shardGuilds = guilds.filter((g) => g.shardId === shard.id);
        return {
            id: shard.id,
            status: Status[shard.status] ?? "Unknown",
            ping: Math.round(shard.ping),
            guilds: shardGuilds.size,
            users: shardGuilds.reduce((sum, g) => sum + g.memberCount, 0)
        };
    });

    const since24h = new Date(Date.now() - 86_400_000);
    const since30d = new Date(Date.now() - 30 * 86_400_000);
    const { commandLogs, wallets, guildMembers } = tables;

    const [[usage], topCommands, perHour, [economy], [leveling]] = await Promise.all([
        db.select({
            total: count(),
            last24h: sql<number>`count(*) filter (where ${commandLogs.createdAt} >= ${since24h})`.mapWith(Number)
        }).from(commandLogs),
        db.select({ command: commandLogs.command, uses: count() }).from(commandLogs)
            .where(gte(commandLogs.createdAt, since30d)).groupBy(commandLogs.command).orderBy(desc(count())).limit(10),
        // Commands per hour over the last 24 hours (UTC), oldest first.
        db.select({
            hour: sql<string>`to_char(date_trunc('hour', ${commandLogs.createdAt} at time zone 'UTC'), 'YYYY-MM-DD"T"HH24')`,
            uses: count()
        }).from(commandLogs).where(gte(commandLogs.createdAt, since24h)).groupBy(sql`1`).orderBy(sql`1`),
        // Coins in the shared (global) economy; servers running their own economy aren't counted.
        db.select({ users: count(), coins: sql<number>`coalesce(sum(${wallets.balance} + ${wallets.bank}), 0)`.mapWith(Number) }).from(wallets).where(eq(wallets.scope, "global")),
        db.select({ members: count(), messages: sql<number>`coalesce(sum(${guildMembers.messages}), 0)`.mapWith(Number) }).from(guildMembers)
    ]);

    // Fill missing hours with 0 so the chart always has 24 bars.
    const byHour = new Map(perHour.map((h) => [h.hour, h.uses]));
    const start = new Date(since24h);
    start.setUTCMinutes(0, 0, 0);
    const hourly = Array.from({ length: 24 }, (_, i) => {
        const key = new Date(start.getTime() + (i + 1) * 3_600_000).toISOString().slice(0, 13);
        return { hour: key, uses: byHour.get(key) ?? 0 };
    });

    const memory = process.memoryUsage();

    return {
        bot: {
            id: client.user?.id,
            username: client.user?.username,
            avatar: client.user?.displayAvatarURL({ size: 256, extension: "webp" }),
            uptimeMs: client.uptime ?? 0,
            readyAt: client.readyAt?.toISOString() ?? null
        },
        totals: {
            guilds: guilds.size,
            users: guilds.reduce((sum, g) => sum + g.memberCount, 0),
            channels: client.channels.cache.size,
            commands: stores.get("commands").size,
            shards: shards.length,
            ping: Math.round(client.ws.ping)
        },
        shards,
        usage: { total: usage?.total ?? 0, last24h: usage?.last24h ?? 0, hourly, topCommands },
        economy: { users: economy?.users ?? 0, coinsInCirculation: economy?.coins ?? 0 },
        // NodeLink node health and how many servers are listening right now.
        music: musicNodeStatus(),
        leveling: { members: leveling?.members ?? 0, messagesCounted: leveling?.messages ?? 0 },
        system: {
            memoryMb: Math.round(memory.rss / 1024 / 1024),
            heapMb: Math.round(memory.heapUsed / 1024 / 1024),
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg()[0] ?? 0,
            platform: `${os.platform()} ${os.arch()}`,
            runtime: `Bun ${Bun.version}`,
            library: `discord.js ${djsVersion}`
        }
    };
}
