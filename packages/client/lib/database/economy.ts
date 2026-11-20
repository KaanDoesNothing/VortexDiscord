import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { guildMembers, inventory, shopItems, wallets, type ShopItem } from "./schema";

// Economy queries. Every balance change is a single conditional UPDATE (or a transaction),
// so two commands at the same moment can never spend the same coins twice.
//
// Wallets are per scope: "global" (shared across servers) or a guild ID (a server running its own
// economy). lib/economy.ts picks the scope from the server's settings.

const where = (scope: string, userId: string) => and(eq(wallets.scope, scope), eq(wallets.userId, userId));

// Creates the wallet with the starting balance if it doesn't exist yet.
export async function ensureWallet(scope: string, userId: string, startingBalance: number) {
    await db.insert(wallets).values({ scope, userId, balance: startingBalance }).onConflictDoNothing();
}

export async function getWallet(scope: string, userId: string, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    const [row] = await db.select().from(wallets).where(where(scope, userId)).limit(1);
    return row!;
}

// Adds `delta` (can be negative), but only if the wallet holds at least `requireAtLeast`.
// Returns the new balance, or null if they couldn't afford it.
export async function adjustBalance(scope: string, userId: string, delta: number, requireAtLeast: number, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    const [row] = await db.update(wallets)
        .set({ balance: sql`${wallets.balance} + ${delta}` })
        .where(and(where(scope, userId), sql`${wallets.balance} >= ${requireAtLeast}`))
        .returning({ balance: wallets.balance });
    return row?.balance ?? null;
}

// Moves coins between two wallets in one transaction. Returns false if the sender can't afford it.
export async function transfer(scope: string, fromId: string, toId: string, amount: number, startingBalance: number) {
    await Promise.all([ensureWallet(scope, fromId, startingBalance), ensureWallet(scope, toId, startingBalance)]);
    return db.transaction(async (tx) => {
        const [sender] = await tx.update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}` })
            .where(and(where(scope, fromId), sql`${wallets.balance} >= ${amount}`))
            .returning({ userId: wallets.userId });
        if (!sender) return false;
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${amount}` }).where(where(scope, toId));
        return true;
    });
}

// Pays the daily reward if the cooldown has passed, otherwise says when it can be claimed next.
// Claiming again within twice the cooldown continues the streak; each streak day adds `streakBonus`
// (up to 10 days). Missing a day resets the streak to 1.
export async function claimDaily(scope: string, userId: string, reward: number, cooldownMs: number, streakBonus: number, startingBalance: number) {
    const wallet = await getWallet(scope, userId, startingBalance);

    // Computed in SQL from the stored values, so concurrent claims can't both succeed.
    const continues = sql`(${wallets.dailyClaimedAt} IS NOT NULL AND ${wallets.dailyClaimedAt} > now() - ${cooldownMs * 2} * interval '1 millisecond')`;
    const newStreak = sql`CASE WHEN ${continues} THEN ${wallets.dailyStreak} + 1 ELSE 1 END`;
    const payout = sql`${reward} + ${streakBonus} * LEAST(${newStreak} - 1, 10)`;

    const [row] = await db.update(wallets)
        .set({ balance: sql`${wallets.balance} + ${payout}`, dailyStreak: newStreak, dailyClaimedAt: sql`now()` })
        .where(and(
            where(scope, userId),
            sql`(${wallets.dailyClaimedAt} IS NULL OR ${wallets.dailyClaimedAt} <= now() - ${cooldownMs} * interval '1 millisecond')`
        ))
        .returning({ balance: wallets.balance, streak: wallets.dailyStreak });

    if (row) {
        const paid = reward + streakBonus * Math.min(row.streak - 1, 10);
        return { claimed: true as const, balance: row.balance, streak: row.streak, paid };
    }
    return { claimed: false as const, nextClaimAt: new Date(wallet.dailyClaimedAt!.getTime() + cooldownMs), streak: wallet.dailyStreak };
}

// Claims a per-user cooldown ("work", "crime", ...). Atomic: only one of several simultaneous
// calls succeeds. Returns { ok: true } or { ok: false, readyAt } with when it can be used again.
export async function claimCooldown(scope: string, userId: string, key: string, cooldownMs: number, startingBalance: number): Promise<{ ok: true } | { ok: false; readyAt: Date }> {
    await ensureWallet(scope, userId, startingBalance);

    const [row] = await db.update(wallets)
        .set({ cooldowns: sql`${wallets.cooldowns} || jsonb_build_object(${key}::text, now())` })
        .where(and(
            where(scope, userId),
            sql`(${wallets.cooldowns} ->> ${key} IS NULL OR (${wallets.cooldowns} ->> ${key})::timestamptz <= now() - ${cooldownMs} * interval '1 millisecond')`
        ))
        .returning({ userId: wallets.userId });
    if (row) return { ok: true };

    const [wallet] = await db.select({ cooldowns: wallets.cooldowns }).from(wallets).where(where(scope, userId));
    const last = new Date(wallet?.cooldowns[key] ?? Date.now());
    return { ok: false, readyAt: new Date(last.getTime() + cooldownMs) };
}

// Gives the cooldown back (e.g. when /rob is aimed at someone who can't be robbed).
export async function releaseCooldown(scope: string, userId: string, key: string) {
    await db.update(wallets).set({ cooldowns: sql`${wallets.cooldowns} - ${key}::text` }).where(where(scope, userId));
}

// Moves coins wallet → bank (amount > 0) or bank → wallet (amount < 0). Returns new balances, or null if short.
export async function moveToBank(scope: string, userId: string, amount: number, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    const [row] = await db.update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amount}`, bank: sql`${wallets.bank} + ${amount}` })
        .where(and(where(scope, userId), amount > 0 ? sql`${wallets.balance} >= ${amount}` : sql`${wallets.bank} >= ${-amount}`))
        .returning({ balance: wallets.balance, bank: wallets.bank });
    return row ?? null;
}

// /rob: in one transaction, takes `amount` from the victim's wallet (if they still have it) and gives it to the robber.
export async function steal(scope: string, robberId: string, victimId: string, amount: number, startingBalance: number) {
    await Promise.all([ensureWallet(scope, robberId, startingBalance), ensureWallet(scope, victimId, startingBalance)]);
    return db.transaction(async (tx) => {
        const [victim] = await tx.update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}` })
            .where(and(where(scope, victimId), sql`${wallets.balance} >= ${amount}`))
            .returning({ userId: wallets.userId });
        if (!victim) return false;
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${amount}` }).where(where(scope, robberId));
        return true;
    });
}

// Fine for a failed /crime or /rob: takes up to `amount` from the wallet, never below 0.
// Returns what was actually taken.
export async function fine(scope: string, userId: string, amount: number, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    return db.transaction(async (tx) => {
        const [wallet] = await tx.select({ balance: wallets.balance }).from(wallets).where(where(scope, userId)).for("update");
        const taken = Math.min(amount, Math.max(0, wallet?.balance ?? 0));
        if (taken > 0) await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${taken}` }).where(where(scope, userId));
        return taken;
    });
}

// Sets a wallet's balance and/or bank (owner panel and /economy admin).
export async function setWallet(scope: string, userId: string, values: { balance?: number; bank?: number }, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    const [row] = await db.update(wallets).set(values).where(where(scope, userId)).returning();
    return row!;
}

// Wipes a server's own economy (balances and inventories). Only for server-mode scopes.
export async function resetScope(scope: string) {
    const rows = await db.delete(wallets).where(eq(wallets.scope, scope)).returning({ userId: wallets.userId });
    await db.delete(inventory).where(eq(inventory.guildId, scope));
    return rows.length;
}

const total = sql<number>`${wallets.balance} + ${wallets.bank}`.mapWith(Number);

// Richest wallets in a scope (wallet + bank).
export async function leaderboard(scope: string, limit = 10) {
    return db.select({ id: wallets.userId, balance: wallets.balance, bank: wallets.bank, total })
        .from(wallets)
        .where(and(eq(wallets.scope, scope), gt(sql`${wallets.balance} + ${wallets.bank}`, 0)))
        .orderBy(desc(sql`${wallets.balance} + ${wallets.bank}`))
        .limit(limit);
}

// Richest global wallets among members of one server (anyone the leveling system has seen there).
export async function globalLeaderboardForGuild(guildId: string, limit = 10) {
    return db.select({ id: wallets.userId, balance: wallets.balance, bank: wallets.bank, total })
        .from(wallets)
        .innerJoin(guildMembers, and(eq(guildMembers.userId, wallets.userId), eq(guildMembers.guildId, guildId)))
        .where(eq(wallets.scope, "global"))
        .orderBy(desc(sql`${wallets.balance} + ${wallets.bank}`))
        .limit(limit);
}

// ---------- Shop ----------

export async function listShopItems(guildId: string, onlyEnabled = false) {
    return db.select().from(shopItems)
        .where(and(eq(shopItems.guildId, guildId), onlyEnabled ? eq(shopItems.enabled, true) : undefined))
        .orderBy(shopItems.price, shopItems.id);
}

export async function getShopItem(guildId: string, id: number) {
    const [row] = await db.select().from(shopItems).where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, id))).limit(1);
    return row ?? null;
}

export type ShopItemInput = Pick<ShopItem, "name" | "description" | "emoji" | "price" | "roleId" | "stock" | "maxPerUser" | "requiredRoleId" | "enabled">;

export async function createShopItem(guildId: string, input: ShopItemInput) {
    const [row] = await db.insert(shopItems).values({ guildId, ...input }).returning();
    return row!;
}

export async function updateShopItem(guildId: string, id: number, input: Partial<ShopItemInput>) {
    const [row] = await db.update(shopItems).set(input).where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, id))).returning();
    return row ?? null;
}

export async function deleteShopItem(guildId: string, id: number) {
    const rows = await db.delete(shopItems).where(and(eq(shopItems.guildId, guildId), eq(shopItems.id, id))).returning({ id: shopItems.id });
    return rows.length > 0;
}

export async function countShopItems(guildId: string) {
    const [row] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(shopItems).where(eq(shopItems.guildId, guildId));
    return row?.n ?? 0;
}

// Buys `quantity` of an item in one transaction: checks stock and the per-user limit, takes the
// money, lowers stock and adds it to the inventory (role items don't go in the inventory).
// Returns { ok: true, balance } or { ok: false, reason }.
export async function buyItem(scope: string, guildId: string, userId: string, item: ShopItem, quantity: number, startingBalance: number) {
    await ensureWallet(scope, userId, startingBalance);
    const cost = item.price * quantity;

    return db.transaction(async (tx) => {
        const [fresh] = await tx.select().from(shopItems).where(eq(shopItems.id, item.id)).for("update");
        if (!fresh || !fresh.enabled) return { ok: false as const, reason: "That item isn't for sale anymore." };
        if (fresh.stock !== null && fresh.stock < quantity) return { ok: false as const, reason: fresh.stock === 0 ? "That item is sold out." : `Only ${fresh.stock} left in stock.` };

        if (!fresh.roleId && fresh.maxPerUser > 0) {
            const [owned] = await tx.select({ quantity: inventory.quantity }).from(inventory)
                .where(and(eq(inventory.guildId, guildId), eq(inventory.userId, userId), eq(inventory.itemId, item.id)));
            if ((owned?.quantity ?? 0) + quantity > fresh.maxPerUser) return { ok: false as const, reason: `You can own at most ${fresh.maxPerUser} of these.` };
        }

        const [paid] = await tx.update(wallets)
            .set({ balance: sql`${wallets.balance} - ${cost}` })
            .where(and(where(scope, userId), sql`${wallets.balance} >= ${cost}`))
            .returning({ balance: wallets.balance });
        if (!paid) return { ok: false as const, reason: "insufficient" };

        if (fresh.stock !== null) await tx.update(shopItems).set({ stock: sql`${shopItems.stock} - ${quantity}` }).where(eq(shopItems.id, item.id));
        if (!fresh.roleId) {
            await tx.insert(inventory).values({ guildId, userId, itemId: item.id, quantity })
                .onConflictDoUpdate({ target: [inventory.guildId, inventory.userId, inventory.itemId], set: { quantity: sql`${inventory.quantity} + ${quantity}` } });
        }
        return { ok: true as const, balance: paid.balance };
    });
}

// Gives back the money (and stock) for a purchase that couldn't be completed, e.g. the role couldn't be given.
export async function refundItem(scope: string, userId: string, item: ShopItem, quantity: number) {
    await db.update(wallets).set({ balance: sql`${wallets.balance} + ${item.price * quantity}` }).where(where(scope, userId));
    if (item.stock !== null) await db.update(shopItems).set({ stock: sql`${shopItems.stock} + ${quantity}` }).where(eq(shopItems.id, item.id));
}

export async function getInventory(guildId: string, userId: string) {
    return db.select({ item: shopItems, quantity: inventory.quantity })
        .from(inventory)
        .innerJoin(shopItems, eq(shopItems.id, inventory.itemId))
        .where(and(eq(inventory.guildId, guildId), eq(inventory.userId, userId), gt(inventory.quantity, 0)))
        .orderBy(shopItems.name);
}

// Takes one item out of a member's inventory (for /use). Returns false if they don't have it.
export async function consumeItem(guildId: string, userId: string, itemId: number) {
    const rows = await db.update(inventory).set({ quantity: sql`${inventory.quantity} - 1` })
        .where(and(eq(inventory.guildId, guildId), eq(inventory.userId, userId), eq(inventory.itemId, itemId), gt(inventory.quantity, 0)))
        .returning({ quantity: inventory.quantity });
    return rows.length > 0;
}

// Inventories for a list of users (owner panel).
export async function inventoriesFor(guildId: string, userIds: string[]) {
    if (!userIds.length) return [];
    return db.select().from(inventory).where(and(eq(inventory.guildId, guildId), inArray(inventory.userId, userIds)));
}
