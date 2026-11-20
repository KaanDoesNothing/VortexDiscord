import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./client";
import { auditLog, commandLogs, guildMembers, guilds, memberEvents, modLogs } from "./schema";
import { guildCache } from "./cache";
import { resolveSettings, type GuildSettings } from "../settings";

/** Read-heavy queries used by the web dashboard. */

export interface Page { page: number; limit: number }

const offset = ({ page, limit }: Page) => (page - 1) * limit;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function getGuildStats(guildId: string) {
    const since30d = daysAgo(30);
    const since14d = daysAgo(13);
    since14d.setUTCHours(0, 0, 0, 0);

    const [totals, topCommands, usageByDay, modActionsByType] = await Promise.all([
        db.select({
            commandsTotal: count(),
            commands7d: sql<number>`count(*) filter (where ${commandLogs.createdAt} >= ${daysAgo(7)})`.mapWith(Number),
            activeUsers30d: sql<number>`count(distinct ${commandLogs.userId}) filter (where ${commandLogs.createdAt} >= ${since30d})`.mapWith(Number)
        }).from(commandLogs).where(eq(commandLogs.guildId, guildId)),

        db.select({ command: commandLogs.command, uses: count() })
            .from(commandLogs)
            .where(and(eq(commandLogs.guildId, guildId), gte(commandLogs.createdAt, since30d)))
            .groupBy(commandLogs.command)
            .orderBy(desc(count()))
            .limit(8),

        db.select({
            day: sql<string>`to_char(date_trunc('day', ${commandLogs.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
            uses: count()
        })
            .from(commandLogs)
            .where(and(eq(commandLogs.guildId, guildId), gte(commandLogs.createdAt, since14d)))
            .groupBy(sql`1`)
            .orderBy(sql`1`),

        db.select({ type: modLogs.type, total: count() })
            .from(modLogs)
            .where(eq(modLogs.guildId, guildId))
            .groupBy(modLogs.type)
            .orderBy(desc(count()))
    ]);

    // Fill in days with no usage so the chart always has 14 bars.
    const byDay = new Map(usageByDay.map((row) => [row.day, row.uses]));
    const days = Array.from({ length: 14 }, (_, i) => {
        const day = new Date(since14d.getTime() + i * 86_400_000).toISOString().slice(0, 10);
        return { day, uses: byDay.get(day) ?? 0 };
    });

    return {
        commandsTotal: totals[0]?.commandsTotal ?? 0,
        commands7d: totals[0]?.commands7d ?? 0,
        activeUsers30d: totals[0]?.activeUsers30d ?? 0,
        modActionsTotal: modActionsByType.reduce((sum, row) => sum + row.total, 0),
        topCommands,
        usageByDay: days,
        modActionsByType
    };
}

// Saves any of prefix / disabled commands / settings JSON, and clears the bot's cached copy.
export async function updateGuildSettings(guildId: string, update: { prefix?: string; disabledCommands?: string[]; settings?: GuildSettings }) {
    const [row] = await db.insert(guilds)
        .values({ id: guildId, ...update })
        .onConflictDoUpdate({ target: guilds.id, set: update })
        .returning();

    guildCache.delete(guildId);
    return row!;
}

// Merges a partial settings change into a server's settings (validated like dashboard input) and saves it.
// For commands that change settings from Discord. Returns the new settings, or the validation errors.
export async function patchSettings(guildId: string, partial: Record<string, unknown>) {
    const { DBManager } = await import("./index");
    const current = await DBManager.getGuildConfig(guildId);
    const { settings, errors } = resolveSettings(partial, current.settings);
    if (errors.length) return { errors, settings: current.settings };
    await updateGuildSettings(guildId, { settings });
    return { errors, settings };
}

export async function listModLogs(guildId: string, page: Page, type?: string) {
    const where = and(eq(modLogs.guildId, guildId), type ? eq(modLogs.type, type) : undefined);

    const [rows, [total]] = await Promise.all([
        db.select().from(modLogs).where(where).orderBy(desc(modLogs.createdAt)).limit(page.limit).offset(offset(page)),
        db.select({ total: count() }).from(modLogs).where(where)
    ]);

    return { rows, total: total?.total ?? 0 };
}

export async function listCommandLogs(guildId: string, page: Page, command?: string) {
    const where = and(eq(commandLogs.guildId, guildId), command ? eq(commandLogs.command, command) : undefined);

    const [rows, [total]] = await Promise.all([
        db.select().from(commandLogs).where(where).orderBy(desc(commandLogs.createdAt)).limit(page.limit).offset(offset(page)),
        db.select({ total: count() }).from(commandLogs).where(where)
    ]);

    return { rows, total: total?.total ?? 0 };
}

export async function getLeaderboard(guildId: string, page: Page) {
    const where = eq(guildMembers.guildId, guildId);

    const [rows, [total]] = await Promise.all([
        db.select().from(guildMembers).where(where)
            .orderBy(desc(guildMembers.xp))
            .limit(page.limit).offset(offset(page)),
        db.select({ total: count() }).from(guildMembers).where(where)
    ]);

    return { rows, total: total?.total ?? 0 };
}

// ---------- Member growth ----------

export async function recordMemberEvent(guildId: string, userId: string, type: "join" | "leave") {
    await db.insert(memberEvents).values({ guildId, userId, type });
}

// Joins and leaves per day for the last `days` days (UTC), with empty days filled in.
export async function getGrowth(guildId: string, days = 30) {
    const since = daysAgo(days - 1);
    since.setUTCHours(0, 0, 0, 0);

    const rows = await db.select({
        day: sql<string>`to_char(date_trunc('day', ${memberEvents.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        joins: sql<number>`count(*) filter (where ${memberEvents.type} = 'join')`.mapWith(Number),
        leaves: sql<number>`count(*) filter (where ${memberEvents.type} = 'leave')`.mapWith(Number)
    })
        .from(memberEvents)
        .where(and(eq(memberEvents.guildId, guildId), gte(memberEvents.createdAt, since)))
        .groupBy(sql`1`);

    const byDay = new Map(rows.map((r) => [r.day, r]));
    return Array.from({ length: days }, (_, i) => {
        const day = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
        return { day, joins: byDay.get(day)?.joins ?? 0, leaves: byDay.get(day)?.leaves ?? 0 };
    });
}

// ---------- Audit trail (dashboard changes) ----------

export async function addAudit(guildId: string, userId: string, action: string, details: Record<string, unknown> = {}) {
    await db.insert(auditLog).values({ guildId, userId, action, details });
}

export async function listAudit(guildId: string, page: Page) {
    const where = eq(auditLog.guildId, guildId);
    const [rows, [total]] = await Promise.all([
        db.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt)).limit(page.limit).offset(offset(page)),
        db.select({ total: count() }).from(auditLog).where(where)
    ]);
    return { rows, total: total?.total ?? 0 };
}
