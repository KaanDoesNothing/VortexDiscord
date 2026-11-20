import { container } from "@sapphire/framework";
import { eq, sql } from "drizzle-orm";
import { db } from "./database/client";
import { users, wallets } from "./database/schema";
import { DEFAULT_SETTINGS } from "./settings";

// Bot list sites: server counts are posted to top.gg and discordbotlist.com (when their tokens are
// in .env) so the bot ranks properly there, and votes on top.gg earn the voter a reward in the shared
// global economy. Votes arrive at POST /webhooks/topgg (routes/webhooks/topgg.post.ts).

export const VOTE_REWARD = Number(Bun.env.VOTE_REWARD ?? 2500);
// top.gg allows a vote every 12 hours.
export const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;

async function postStats() {
    const client = container.client;
    const servers = client.guilds.cache.size;
    const shards = client.ws.shards.size;
    const id = client.user!.id;

    if (Bun.env.TOPGG_TOKEN) {
        await fetch(`https://top.gg/api/bots/${id}/stats`, {
            method: "POST",
            headers: { Authorization: Bun.env.TOPGG_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ server_count: servers, shard_count: shards }),
            signal: AbortSignal.timeout(15_000)
        }).catch((error) => container.logger.debug("top.gg stats post failed:", error));
    }
    if (Bun.env.DBL_TOKEN) {
        await fetch(`https://discordbotlist.com/api/v1/bots/${id}/stats`, {
            method: "POST",
            headers: { Authorization: Bun.env.DBL_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ guilds: servers, users: client.guilds.cache.reduce((n, g) => n + g.memberCount, 0) }),
            signal: AbortSignal.timeout(15_000)
        }).catch((error) => container.logger.debug("discordbotlist stats post failed:", error));
    }
}

export function startBotListStats() {
    if (!Bun.env.TOPGG_TOKEN && !Bun.env.DBL_TOKEN) return;
    setTimeout(() => void postStats(), 60_000).unref();
    setInterval(() => void postStats(), 30 * 60_000).unref();
}

// Rewards a vote (once per cooldown, so replayed webhooks can't pay twice). Returns false if it was a repeat.
export async function rewardVote(userId: string, weekend = false) {
    const amount = weekend ? VOTE_REWARD * 2 : VOTE_REWARD;
    return db.transaction(async (tx) => {
        await tx.insert(users).values({ id: userId }).onConflictDoNothing();
        const [fresh] = await tx.update(users).set({ lastVoteAt: new Date() })
            .where(sql`${users.id} = ${userId} AND (${users.lastVoteAt} IS NULL OR ${users.lastVoteAt} < now() - ${VOTE_COOLDOWN_MS} * interval '1 millisecond')`)
            .returning({ id: users.id });
        if (!fresh) return false;

        await tx.insert(wallets).values({ scope: "global", userId, balance: DEFAULT_SETTINGS.economy.startingBalance + amount })
            .onConflictDoUpdate({ target: [wallets.scope, wallets.userId], set: { balance: sql`${wallets.balance} + ${amount}` } });
        return true;
    });
}

export async function lastVote(userId: string) {
    const [row] = await db.select({ lastVoteAt: users.lastVoteAt }).from(users).where(eq(users.id, userId));
    return row?.lastVoteAt ?? null;
}
