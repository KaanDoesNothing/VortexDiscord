import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { commandLogs, guildMembers, guilds, modLogs, modNotes, users, type ModLogType } from "./schema";
import { readSettings, type GuildSettings } from "../settings";
import { guildCache } from "./cache";

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
            return { prefix: row.prefix, disabledCommands: row.disabledCommands, settings: readSettings(row.settings) };
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

    /**
     * Adds `delta` (can be negative) to a balance, but only if the user has at least `requireAtLeast`.
     * Returns the new balance, or null if they couldn't afford it.
     */
    async adjustBalance(id: string, delta: number, requireAtLeast = 0) {
        await this.getUser(id);

        const [row] = await db.update(users)
            .set({ balance: sql`${users.balance} + ${delta}` })
            .where(and(eq(users.id, id), sql`${users.balance} >= ${requireAtLeast}`))
            .returning({ balance: users.balance });

        return row?.balance ?? null;
    }

    /** Moves coins between users in one transaction. Returns false if the sender can't afford it. */
    async transfer(fromId: string, toId: string, amount: number) {
        await Promise.all([this.getUser(fromId), this.getUser(toId)]);

        return db.transaction(async (tx) => {
            const [sender] = await tx.update(users)
                .set({ balance: sql`${users.balance} - ${amount}` })
                .where(and(eq(users.id, fromId), sql`${users.balance} >= ${amount}`))
                .returning({ id: users.id });

            if (!sender) return false;

            await tx.update(users).set({ balance: sql`${users.balance} + ${amount}` }).where(eq(users.id, toId));
            return true;
        });
    }

    /** Pays the daily reward if the cooldown has passed. Otherwise returns when it can be claimed next. */
    /**
     * Pays the daily reward if the cooldown has passed, otherwise returns when it can be claimed next.
     * Claiming again within twice the cooldown continues the streak; each streak day adds
     * `streakBonus` (up to 10 days). Missing a day resets the streak to 1.
     */
    async claimDaily(id: string, reward: number, cooldownMs: number, streakBonus = 0) {
        const user = await this.getUser(id);

        // Computed in SQL from the stored values, so concurrent claims can't both succeed.
        const continues = sql`(${users.dailyClaimedAt} IS NOT NULL AND ${users.dailyClaimedAt} > now() - ${cooldownMs * 2} * interval '1 millisecond')`;
        const newStreak = sql`CASE WHEN ${continues} THEN ${users.dailyStreak} + 1 ELSE 1 END`;
        const payout = sql`${reward} + ${streakBonus} * LEAST(${newStreak} - 1, 10)`;

        const [row] = await db.update(users)
            .set({ balance: sql`${users.balance} + ${payout}`, dailyStreak: newStreak, dailyClaimedAt: sql`now()` })
            .where(and(
                eq(users.id, id),
                sql`(${users.dailyClaimedAt} IS NULL OR ${users.dailyClaimedAt} <= now() - ${cooldownMs} * interval '1 millisecond')`
            ))
            .returning({ balance: users.balance, streak: users.dailyStreak });

        if (row) {
            const paid = reward + streakBonus * Math.min(row.streak - 1, 10);
            return { claimed: true as const, balance: row.balance, streak: row.streak, paid };
        }

        return { claimed: false as const, nextClaimAt: new Date(user.dailyClaimedAt!.getTime() + cooldownMs), streak: user.dailyStreak };
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

    /**
     * Counts a message toward leveling. Returns the new level if this message leveled the member up.
     * Levels never go down (e.g. if messagesPerLevel is raised later).
     */
    async addMessage(guildId: string, userId: string, messagesPerLevel: number) {
        const [row] = await db.insert(guildMembers)
            .values({ guildId, userId, messages: 1, level: 1 })
            .onConflictDoUpdate({
                target: [guildMembers.guildId, guildMembers.userId],
                set: {
                    messages: sql`${guildMembers.messages} + 1`,
                    level: sql`GREATEST(${guildMembers.level}, FLOOR((${guildMembers.messages} + 1) / ${messagesPerLevel}::numeric)::int + 1)`
                }
            })
            .returning({ level: guildMembers.level, messages: guildMembers.messages });

        const computed = Math.floor(row!.messages / messagesPerLevel) + 1;
        const leveledUp = row!.messages % messagesPerLevel === 0 && row!.level === computed && computed > 1;
        return leveledUp ? row!.level : null;
    }

    // ---------- Logs ----------

    async addModLog(entry: { guildId: string; type: ModLogType; moderatorId: string; targetId: string; reason?: string }) {
        await db.insert(modLogs).values(entry);
    }

    // How many actions of a type a user has received in a server (used for warning thresholds).
    async countModLogs(guildId: string, targetId: string, type: ModLogType) {
        const [row] = await db.select({ total: count() }).from(modLogs)
            .where(and(eq(modLogs.guildId, guildId), eq(modLogs.targetId, targetId), eq(modLogs.type, type)));
        return row?.total ?? 0;
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

    async logCommand(entry: { guildId: string | null; userId: string; command: string; parameters?: string; slash?: boolean }) {
        await db.insert(commandLogs).values(entry);
    }
}

export const DBManager = new Manager();
