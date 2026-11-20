import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./client";
import { commandLogs, guildMembers, guilds, modLogs, modNotes, users, type ModLogType } from "./schema";
import { readSettings, type GuildSettings } from "../settings";
import { guildCache } from "./cache";
import { setBranding } from "../structures/context";

export { db, runMigrations } from "./client";
export * as tables from "./schema";
export * as Dashboard from "./dashboard";
export * as CustomCommands from "./customCommands";
export * as Economy from "./economy";
export * as Engagement from "./engagement";
export * as Utility from "./utility";
export type * from "./schema";

/**
 * All database access for the bot goes through here.
 * Balance changes are single atomic UPDATEs, so concurrent commands can't double-spend.
 */
class Manager {
    // ---------- Guilds ----------

    async getGuild(id: string) {
        const [existing] = await db.select().from(guilds).where(eq(guilds.id, id)).limit(1);
        if (existing) return existing;

        const [created] = await db.insert(guilds).values({ id }).onConflictDoNothing().returning();
        return created ?? (await db.select().from(guilds).where(eq(guilds.id, id)).limit(1))[0]!;
    }

    /**
     * Prefix, disabled commands and parsed settings, cached briefly because the bot
     * reads this on every message. Writes through DBManager/Dashboard clear the cache.
     */
    async getGuildConfig(id: string): Promise<{ prefix: string; disabledCommands: string[]; settings: GuildSettings }> {
        return guildCache.get(id, async () => {
            const row = await this.getGuild(id);
            const settings = readSettings(row.settings);
            // Embeds read branding synchronously; keep it as fresh as the cached settings.
            setBranding(id, settings.branding);
            return { prefix: row.prefix, disabledCommands: row.disabledCommands, settings };
        });
    }

    async setPrefix(id: string, prefix: string) {
        await db.insert(guilds).values({ id, prefix })
            .onConflictDoUpdate({ target: guilds.id, set: { prefix } });
        guildCache.delete(id);
    }

    /** Flips a command between enabled and disabled. Returns true if it is now disabled. */
    async toggleCommand(id: string, command: string) {
        await this.getGuild(id);

        const [row] = await db.update(guilds)
            .set({
                disabledCommands: sql`CASE WHEN ${command} = ANY(${guilds.disabledCommands})
                    THEN array_remove(${guilds.disabledCommands}, ${command})
                    ELSE array_append(${guilds.disabledCommands}, ${command}) END`
            })
            .where(eq(guilds.id, id))
            .returning({ disabledCommands: guilds.disabledCommands });

        guildCache.delete(id);
        return row!.disabledCommands.includes(command);
    }

    // ---------- Users ----------

    async getUser(id: string) {
        const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (existing) return existing;

        const [created] = await db.insert(users).values({ id }).onConflictDoNothing().returning();
        return created ?? (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]!;
    }

    async setBio(id: string, bio: string) {
        await db.insert(users).values({ id, bio }).onConflictDoUpdate({ target: users.id, set: { bio } });
    }

    /** Adds or removes a like/dislike, never going below zero. */
    async adjustReaction(id: string, kind: "likes" | "dislikes", delta: 1 | -1) {
        await this.getUser(id);

        const column = users[kind];
        await db.update(users).set({ [kind]: sql`GREATEST(${column} + ${delta}, 0)` }).where(eq(users.id, id));
    }

    // ---------- Guild members ----------

    async getGuildMember(guildId: string, userId: string) {
        const where = and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId));

        const [existing] = await db.select().from(guildMembers).where(where).limit(1);
        if (existing) return existing;

        const [created] = await db.insert(guildMembers).values({ guildId, userId }).onConflictDoNothing().returning();
        return created ?? (await db.select().from(guildMembers).where(where).limit(1))[0]!;
    }

    // ---------- Logs ----------

    // Records a moderation action. Returns its case number.
    async addModLog(entry: { guildId: string; type: ModLogType; moderatorId: string; targetId: string; reason?: string }) {
        const [row] = await db.insert(modLogs).values(entry).returning({ id: modLogs.id });
        return row!.id;
    }

    // How many actions of a type a user has received in a server (used for warning thresholds).
    // With withinDays > 0, only actions from that many days back count (expiring warnings).
    async countModLogs(guildId: string, targetId: string, type: ModLogType, withinDays = 0) {
        const [row] = await db.select({ total: count() }).from(modLogs)
            .where(and(
                eq(modLogs.guildId, guildId), eq(modLogs.targetId, targetId), eq(modLogs.type, type),
                withinDays > 0 ? gte(modLogs.createdAt, new Date(Date.now() - withinDays * 86_400_000)) : undefined
            ));
        return row?.total ?? 0;
    }

    // ---------- Cases ----------

    async getCase(guildId: string, id: number) {
        const [row] = await db.select().from(modLogs).where(and(eq(modLogs.guildId, guildId), eq(modLogs.id, id))).limit(1);
        return row ?? null;
    }

    async updateCaseReason(guildId: string, id: number, reason: string) {
        const [row] = await db.update(modLogs).set({ reason }).where(and(eq(modLogs.guildId, guildId), eq(modLogs.id, id))).returning();
        return row ?? null;
    }

    // Deleting a warning's case also takes it off the member's warning count.
    async deleteCase(guildId: string, id: number) {
        const rows = await db.delete(modLogs).where(and(eq(modLogs.guildId, guildId), eq(modLogs.id, id))).returning({ id: modLogs.id });
        return rows.length > 0;
    }

    // ---------- Mod notes ----------

    async addNote(guildId: string, targetId: string, authorId: string, content: string) {
        const [row] = await db.insert(modNotes).values({ guildId, targetId, authorId, content }).returning();
        return row!;
    }

    async listNotes(guildId: string, targetId: string) {
        return db.select().from(modNotes)
            .where(and(eq(modNotes.guildId, guildId), eq(modNotes.targetId, targetId)))
            .orderBy(desc(modNotes.createdAt))
            .limit(25);
    }

    async removeNote(guildId: string, id: number) {
        const rows = await db.delete(modNotes).where(and(eq(modNotes.guildId, guildId), eq(modNotes.id, id))).returning({ id: modNotes.id });
        return rows.length > 0;
    }

    async getModLogs(guildId: string, targetId: string, options: { type?: ModLogType; limit?: number } = {}) {
        return db.select().from(modLogs)
            .where(and(
                eq(modLogs.guildId, guildId),
                eq(modLogs.targetId, targetId),
                options.type ? eq(modLogs.type, options.type) : undefined
            ))
            .orderBy(desc(modLogs.createdAt))
            .limit(options.limit ?? 25);
    }

    // Command logs are queued and written in batches (one INSERT every few seconds instead of one
    // per command). The dashboard's command log can lag by up to LOG_FLUSH_MS.
    private logQueue: (typeof commandLogs.$inferInsert)[] = [];
    private logTimer: Timer | null = null;

    async logCommand(entry: { guildId: string | null; userId: string; command: string; parameters?: string; slash?: boolean }) {
        this.logQueue.push({ ...entry, parameters: (entry.parameters ?? "").slice(0, 1000), createdAt: new Date() });
        if (this.logQueue.length >= 200) await this.flushCommandLogs();
        else this.logTimer ??= setTimeout(() => void this.flushCommandLogs(), LOG_FLUSH_MS);
    }

    async flushCommandLogs() {
        if (this.logTimer) clearTimeout(this.logTimer);
        this.logTimer = null;
        const batch = this.logQueue.splice(0);
        if (batch.length) await db.insert(commandLogs).values(batch).catch(() => null);
    }
}

const LOG_FLUSH_MS = 5_000;

export const DBManager = new Manager();
