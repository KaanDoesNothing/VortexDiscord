import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./client";
import { guildMembers, users } from "./schema";

// Economy queries. Every balance change is a single conditional UPDATE (or a transaction),
// so two commands at the same moment can never spend the same coins twice.

const ensureUser = (id: string) => db.insert(users).values({ id }).onConflictDoNothing();

// Claims a per-user cooldown ("work", "crime", ...). Atomic: only one of several simultaneous
// calls succeeds. Returns { ok: true } or { ok: false, readyAt } with when it can be used again.
export async function claimCooldown(userId: string, key: string, cooldownMs: number): Promise<{ ok: true } | { ok: false; readyAt: Date }> {
    await ensureUser(userId);

    const [row] = await db.update(users)
        .set({ cooldowns: sql`${users.cooldowns} || jsonb_build_object(${key}::text, now())` })
        .where(and(
            eq(users.id, userId),
            sql`(${users.cooldowns} ->> ${key} IS NULL OR (${users.cooldowns} ->> ${key})::timestamptz <= now() - ${cooldownMs} * interval '1 millisecond')`
        ))
        .returning({ id: users.id });

    if (row) return { ok: true };

    const [user] = await db.select({ cooldowns: users.cooldowns }).from(users).where(eq(users.id, userId));
    const last = new Date(user?.cooldowns[key] ?? Date.now());
    return { ok: false, readyAt: new Date(last.getTime() + cooldownMs) };
}

// Gives the cooldown back (e.g. when /rob is aimed at someone who can't be robbed).
export async function releaseCooldown(userId: string, key: string) {
    await db.update(users).set({ cooldowns: sql`${users.cooldowns} - ${key}::text` }).where(eq(users.id, userId));
}

// Moves coins wallet → bank (amount > 0) or bank → wallet (amount < 0). Returns new balances, or null if short.
export async function moveToBank(userId: string, amount: number) {
    await ensureUser(userId);

    const [row] = await db.update(users)
        .set({ balance: sql`${users.balance} - ${amount}`, bank: sql`${users.bank} + ${amount}` })
        .where(and(eq(users.id, userId), amount > 0 ? sql`${users.balance} >= ${amount}` : sql`${users.bank} >= ${-amount}`))
        .returning({ balance: users.balance, bank: users.bank });

    return row ?? null;
}

// /rob: in one transaction, takes `amount` from the victim's wallet (if they still have it) and gives it to the robber.
export async function steal(robberId: string, victimId: string, amount: number) {
    await Promise.all([ensureUser(robberId), ensureUser(victimId)]);

    return db.transaction(async (tx) => {
        const [victim] = await tx.update(users)
            .set({ balance: sql`${users.balance} - ${amount}` })
            .where(and(eq(users.id, victimId), sql`${users.balance} >= ${amount}`))
            .returning({ id: users.id });
        if (!victim) return false;

        await tx.update(users).set({ balance: sql`${users.balance} + ${amount}` }).where(eq(users.id, robberId));
        return true;
    });
}

// Fine for a failed /crime or /rob: takes up to `amount` from the wallet, never below 0.
// Returns what was actually taken (less than `amount` if they didn't have it all).
export async function fine(userId: string, amount: number) {
    await ensureUser(userId);

    return db.transaction(async (tx) => {
        const [user] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).for("update");
        const taken = Math.min(amount, Math.max(0, user?.balance ?? 0));
        if (taken > 0) await tx.update(users).set({ balance: sql`${users.balance} - ${taken}` }).where(eq(users.id, userId));
        return taken;
    });
}

// Top users by total worth (wallet + bank), across all servers.
export async function globalLeaderboard(limit = 10) {
    return db.select({ id: users.id, balance: users.balance, bank: users.bank, total: sql<number>`${users.balance} + ${users.bank}`.mapWith(Number) })
        .from(users)
        .where(gt(sql`${users.balance} + ${users.bank}`, 0))
        .orderBy(desc(sql`${users.balance} + ${users.bank}`))
        .limit(limit);
}

// Top users by total worth among members of one server (anyone the leveling system has seen there).
export async function serverLeaderboard(guildId: string, limit = 10) {
    return db.select({ id: users.id, balance: users.balance, bank: users.bank, total: sql<number>`${users.balance} + ${users.bank}`.mapWith(Number) })
        .from(users)
        .innerJoin(guildMembers, and(eq(guildMembers.userId, users.id), eq(guildMembers.guildId, guildId)))
        .orderBy(desc(sql`${users.balance} + ${users.bank}`))
        .limit(limit);
}
