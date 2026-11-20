import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { blacklist, botConfig, scheduledTasks, suggestions, tickets } from "./schema";

// Queries for tickets, suggestions, scheduled announcements/reminders, and owner-level settings.

// ---------- Tickets ----------

export async function openTicket(input: { guildId: string; channelId: string; ownerId: string; topic?: string | null; type?: string | null }) {
    const [row] = await db.insert(tickets).values(input).returning();
    return row!;
}

export async function countOpenTickets(guildId: string, ownerId: string) {
    const [row] = await db.select({ n: count() }).from(tickets).where(and(eq(tickets.guildId, guildId), eq(tickets.ownerId, ownerId), eq(tickets.closed, false)));
    return row?.n ?? 0;
}

export async function getTicketByChannel(channelId: string) {
    const [row] = await db.select().from(tickets).where(and(eq(tickets.channelId, channelId), eq(tickets.closed, false)));
    return row ?? null;
}

// Marks a staff member as handling the ticket (null = unclaim).
export async function claimTicket(id: number, staffId: string | null) {
    const [row] = await db.update(tickets).set({ claimedBy: staffId }).where(eq(tickets.id, id)).returning();
    return row ?? null;
}

export async function closeTicket(id: number, closedBy: string) {
    const [row] = await db.update(tickets).set({ closed: true, closedBy, closedAt: new Date() })
        .where(and(eq(tickets.id, id), eq(tickets.closed, false))).returning();
    return row ?? null;
}

export async function listTickets(guildId: string, limit = 50) {
    return db.select().from(tickets).where(eq(tickets.guildId, guildId)).orderBy(desc(tickets.createdAt)).limit(limit);
}

// ---------- Suggestions ----------

export async function createSuggestion(input: { guildId: string; channelId: string; authorId: string; content: string }) {
    const [row] = await db.insert(suggestions).values(input).returning();
    return row!;
}

export async function setSuggestionMessage(id: number, messageId: string) {
    await db.update(suggestions).set({ messageId }).where(eq(suggestions.id, id));
}

export async function getSuggestion(guildId: string, id: number) {
    const [row] = await db.select().from(suggestions).where(and(eq(suggestions.guildId, guildId), eq(suggestions.id, id)));
    return row ?? null;
}

export async function setSuggestionStatus(guildId: string, id: number, status: string, response: string | null) {
    const [row] = await db.update(suggestions).set({ status, response })
        .where(and(eq(suggestions.guildId, guildId), eq(suggestions.id, id))).returning();
    return row ?? null;
}

export async function listSuggestions(guildId: string, status?: string) {
    return db.select().from(suggestions)
        .where(and(eq(suggestions.guildId, guildId), status ? eq(suggestions.status, status) : undefined))
        .orderBy(desc(suggestions.createdAt)).limit(100);
}

// ---------- Scheduled tasks (announcements, reminders) ----------

export async function listTasks(guildId: string, types: string[]) {
    return db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.guildId, guildId), inArray(scheduledTasks.type, types)))
        .orderBy(scheduledTasks.runAt);
}

export async function listUserReminders(userId: string) {
    return db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.type, "reminder"), sql`${scheduledTasks.payload} ->> 'userId' = ${userId}`))
        .orderBy(scheduledTasks.runAt).limit(25);
}

export async function deleteUserReminder(userId: string, id: number) {
    const rows = await db.delete(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.type, "reminder"), sql`${scheduledTasks.payload} ->> 'userId' = ${userId}`))
        .returning({ id: scheduledTasks.id });
    return rows.length > 0;
}

// ---------- Owner: blacklist + bot config ----------

export async function listBlacklist() {
    return db.select().from(blacklist).orderBy(desc(blacklist.createdAt));
}

export async function addToBlacklist(id: string, type: "user" | "guild", reason: string, createdBy: string) {
    await db.insert(blacklist).values({ id, type, reason, createdBy })
        .onConflictDoUpdate({ target: blacklist.id, set: { type, reason, createdBy } });
}

export async function removeFromBlacklist(id: string) {
    const rows = await db.delete(blacklist).where(eq(blacklist.id, id)).returning({ id: blacklist.id });
    return rows.length > 0;
}

export async function getBotConfig<T>(key: string, fallback: T): Promise<T> {
    const [row] = await db.select().from(botConfig).where(eq(botConfig.key, key));
    return (row?.value as T | undefined) ?? fallback;
}

export async function setBotConfig(key: string, value: unknown) {
    await db.insert(botConfig).values({ key, value }).onConflictDoUpdate({ target: botConfig.key, set: { value } });
}
