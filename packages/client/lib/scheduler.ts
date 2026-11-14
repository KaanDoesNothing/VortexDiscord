import { container } from "@sapphire/framework";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./database/client";
import { scheduledTasks, type ScheduledTask } from "./database/schema";

// Runs things later: temp-ban expiry, reminders, giveaway endings, announcements, birthdays.
//
// Tasks live in the scheduled_tasks table, so they survive restarts. Every POLL_MS the scheduler
// claims due tasks atomically (one-shot tasks are deleted, repeating ones are moved to their next
// run) and then runs the handler registered for the task's type.

type Handler = (task: ScheduledTask) => Promise<void>;

const POLL_MS = 15_000;
const BATCH = 50;
const handlers = new Map<string, Handler>();
let timer: Timer | null = null;

// Registers the function that runs tasks of a given type.
export function registerTask(type: string, handler: Handler) {
    handlers.set(type, handler);
}

// Schedules a task. Returns its ID (used to cancel it).
export async function schedule(task: { type: string; runAt: Date; guildId?: string | null; payload?: Record<string, unknown>; repeatMinutes?: number | null; createdBy?: string | null }) {
    const [row] = await db.insert(scheduledTasks).values({
        type: task.type,
        runAt: task.runAt,
        guildId: task.guildId ?? null,
        payload: task.payload ?? {},
        repeatMinutes: task.repeatMinutes ?? null,
        createdBy: task.createdBy ?? null
    }).returning({ id: scheduledTasks.id });
    return row!.id;
}

// Cancels a task, optionally only if it belongs to the given guild.
export async function cancelTask(id: number, guildId?: string) {
    const rows = await db.delete(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), guildId ? eq(scheduledTasks.guildId, guildId) : undefined))
        .returning({ id: scheduledTasks.id });
    return rows.length > 0;
}

// Claims due tasks so that each one runs exactly once, even with several bot processes.
async function claimDue(): Promise<ScheduledTask[]> {
    // One-shot: delete and return.
    const oneShot = await db.execute(sql`
        DELETE FROM ${scheduledTasks}
        WHERE id IN (
            SELECT id FROM ${scheduledTasks}
            WHERE run_at <= now() AND repeat_minutes IS NULL
            ORDER BY run_at LIMIT ${BATCH}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *`);

    // Repeating: move to the next future run and return the old row.
    const repeating = await db.execute(sql`
        UPDATE ${scheduledTasks} t SET run_at = t.run_at + make_interval(mins => t.repeat_minutes *
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - t.run_at)) / 60 / t.repeat_minutes)::int))
        WHERE id IN (
            SELECT id FROM ${scheduledTasks}
            WHERE run_at <= now() AND repeat_minutes IS NOT NULL
            ORDER BY run_at LIMIT ${BATCH}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *`);

    const rows = [...toRows(oneShot), ...toRows(repeating)];
    return rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        guildId: r.guild_id,
        runAt: new Date(r.run_at),
        repeatMinutes: r.repeat_minutes,
        payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
        createdBy: r.created_by,
        createdAt: new Date(r.created_at)
    }));
}

// Different drivers return either an array or { rows }.
const toRows = (result: unknown): unknown[] => (Array.isArray(result) ? result : ((result as { rows?: unknown[] })?.rows ?? []));

async function tick() {
    let tasks: ScheduledTask[] = [];
    try {
        tasks = await claimDue();
    } catch (error) {
        container.logger.error("Scheduler: couldn't claim tasks:", error);
        return;
    }

    for (const task of tasks) {
        const handler = handlers.get(task.type);
        if (!handler) {
            container.logger.warn(`Scheduler: no handler for task type "${task.type}" (#${task.id})`);
            continue;
        }
        // One failing task must not stop the others.
        await handler(task).catch((error) => container.logger.error(`Scheduler: task #${task.id} (${task.type}) failed:`, error));
    }
}

export function startScheduler() {
    if (timer) return;
    timer = setInterval(tick, POLL_MS);
    void tick();
}

export function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
}

// Parses "10m", "2h30m", "1d", "1w" into milliseconds. Returns null if invalid.
export function parseDuration(input: string): number | null {
    const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
    const clean = input.trim().toLowerCase().replace(/\s+/g, "");
    if (!/^(\d+[smhdw])+$/.test(clean)) return null;

    let total = 0;
    for (const [, amount, unit] of clean.matchAll(/(\d+)([smhdw])/g)) total += Number(amount) * units[unit!]!;
    return total > 0 ? total : null;
}

// 90_000 → "1m 30s"
export function formatDuration(ms: number) {
    const parts: string[] = [];
    for (const [unit, size] of [["d", 86_400_000], ["h", 3_600_000], ["m", 60_000], ["s", 1_000]] as const) {
        const n = Math.floor(ms / size);
        if (n) parts.push(`${n}${unit}`);
        ms -= n * size;
    }
    return parts.slice(0, 2).join(" ") || "0s";
}
