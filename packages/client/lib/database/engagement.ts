import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { birthdays, giveaways, guildMembers, pollVotes, polls, rolePanels, starboardEntries, type RolePanel } from "./schema";

// Queries for the engagement features: birthdays, giveaways, polls, role panels, starboard, rank.

// ---------- Birthdays ----------

export async function getBirthday(userId: string) {
    const [row] = await db.select().from(birthdays).where(eq(birthdays.userId, userId));
    return row ?? null;
}

export async function setBirthday(userId: string, month: number, day: number) {
    await db.insert(birthdays).values({ userId, month, day })
        .onConflictDoUpdate({ target: birthdays.userId, set: { month, day } });
}

export async function clearBirthday(userId: string) {
    await db.delete(birthdays).where(eq(birthdays.userId, userId));
}

// User IDs with a birthday on this date. Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
export async function birthdaysOn(month: number, day: number, isLeapYear: boolean) {
    const rows = await db.select({ userId: birthdays.userId }).from(birthdays).where(
        month === 2 && day === 28 && !isLeapYear
            ? sql`${birthdays.month} = 2 AND ${birthdays.day} IN (28, 29)`
            : and(eq(birthdays.month, month), eq(birthdays.day, day))
    );
    return rows.map((r) => r.userId);
}

// ---------- Giveaways ----------

export async function createGiveaway(input: { guildId: string; channelId: string; prize: string; winnerCount: number; hostId: string; endsAt: Date }) {
    const [row] = await db.insert(giveaways).values(input).returning();
    return row!;
}

export async function setGiveawayMessage(id: number, messageId: string) {
    await db.update(giveaways).set({ messageId }).where(eq(giveaways.id, id));
}

export async function getGiveaway(id: number) {
    const [row] = await db.select().from(giveaways).where(eq(giveaways.id, id));
    return row ?? null;
}

// Joins or leaves a running giveaway. Returns "joined" | "left" | "ended".
export async function toggleGiveawayEntry(id: number, userId: string) {
    const [row] = await db.update(giveaways)
        .set({
            entrants: sql`CASE WHEN ${userId} = ANY(${giveaways.entrants})
                THEN array_remove(${giveaways.entrants}, ${userId})
                ELSE array_append(${giveaways.entrants}, ${userId}) END`
        })
        .where(and(eq(giveaways.id, id), eq(giveaways.ended, false)))
        .returning({ entrants: giveaways.entrants });

    if (!row) return { state: "ended" as const, count: 0 };
    return { state: row.entrants.includes(userId) ? "joined" as const : "left" as const, count: row.entrants.length };
}

// Marks a giveaway ended and stores the winners. Returns null if it had already ended (so it ends once).
export async function finishGiveaway(id: number, pickWinners: (entrants: string[]) => string[]) {
    return db.transaction(async (tx) => {
        const [g] = await tx.select().from(giveaways).where(and(eq(giveaways.id, id), eq(giveaways.ended, false))).for("update");
        if (!g) return null;

        const winners = pickWinners(g.entrants);
        const [row] = await tx.update(giveaways).set({ ended: true, winners }).where(eq(giveaways.id, id)).returning();
        return row!;
    });
}

// Picks new winners for an ended giveaway (excluding the previous ones when possible).
export async function rerollGiveaway(id: number, pickWinners: (entrants: string[], previous: string[]) => string[]) {
    const g = await getGiveaway(id);
    if (!g || !g.ended) return null;

    const winners = pickWinners(g.entrants, g.winners);
    const [row] = await db.update(giveaways).set({ winners }).where(eq(giveaways.id, id)).returning();
    return row!;
}

export async function listGiveaways(guildId: string) {
    return db.select().from(giveaways).where(eq(giveaways.guildId, guildId)).orderBy(desc(giveaways.createdAt)).limit(50);
}

// ---------- Polls ----------

export async function createPoll(input: { guildId: string; channelId: string; question: string; options: string[]; authorId: string }) {
    const [row] = await db.insert(polls).values(input).returning();
    return row!;
}

export async function setPollMessage(id: number, messageId: string) {
    await db.update(polls).set({ messageId }).where(eq(polls.id, id));
}

export async function getPoll(id: number) {
    const [row] = await db.select().from(polls).where(eq(polls.id, id));
    return row ?? null;
}

// One vote per user; voting for the same option again removes the vote.
export async function votePoll(pollId: number, userId: string, option: number) {
    return db.transaction(async (tx) => {
        const [existing] = await tx.select().from(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
        if (existing?.option === option) {
            await tx.delete(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
            return "removed" as const;
        }
        await tx.insert(pollVotes).values({ pollId, userId, option })
            .onConflictDoUpdate({ target: [pollVotes.pollId, pollVotes.userId], set: { option } });
        return existing ? "changed" as const : "voted" as const;
    });
}

// Vote counts per option index.
export async function pollResults(pollId: number, optionCount: number) {
    const rows = await db.select({ option: pollVotes.option, votes: count() }).from(pollVotes)
        .where(eq(pollVotes.pollId, pollId)).groupBy(pollVotes.option);
    const counts = Array.from({ length: optionCount }, () => 0);
    for (const r of rows) if (r.option < optionCount) counts[r.option] = r.votes;
    return counts;
}

export async function closePoll(id: number) {
    const [row] = await db.update(polls).set({ closed: true }).where(and(eq(polls.id, id), eq(polls.closed, false))).returning();
    return row ?? null;
}

// ---------- Role panels ----------

export async function listRolePanels(guildId: string) {
    return db.select().from(rolePanels).where(eq(rolePanels.guildId, guildId)).orderBy(asc(rolePanels.id));
}

export async function getRolePanel(id: number) {
    const [row] = await db.select().from(rolePanels).where(eq(rolePanels.id, id));
    return row ?? null;
}

export async function saveRolePanel(guildId: string, input: Pick<RolePanel, "channelId" | "title" | "description" | "roles" | "mode">, id?: number) {
    if (id) {
        const [row] = await db.update(rolePanels).set(input).where(and(eq(rolePanels.id, id), eq(rolePanels.guildId, guildId))).returning();
        return row ?? null;
    }
    const [row] = await db.insert(rolePanels).values({ guildId, ...input }).returning();
    return row!;
}

export async function setRolePanelMessage(id: number, messageId: string | null) {
    await db.update(rolePanels).set({ messageId }).where(eq(rolePanels.id, id));
}

export async function deleteRolePanel(guildId: string, id: number) {
    const [row] = await db.delete(rolePanels).where(and(eq(rolePanels.id, id), eq(rolePanels.guildId, guildId))).returning();
    return row ?? null;
}

// ---------- Starboard ----------

export async function getStarboardEntry(guildId: string, messageId: string) {
    const [row] = await db.select().from(starboardEntries).where(and(eq(starboardEntries.guildId, guildId), eq(starboardEntries.messageId, messageId)));
    return row ?? null;
}

export async function saveStarboardEntry(guildId: string, messageId: string, starboardMessageId: string, stars: number) {
    await db.insert(starboardEntries).values({ guildId, messageId, starboardMessageId, stars })
        .onConflictDoUpdate({ target: [starboardEntries.guildId, starboardEntries.messageId], set: { stars, starboardMessageId } });
}

export async function deleteStarboardEntry(guildId: string, messageId: string) {
    await db.delete(starboardEntries).where(and(eq(starboardEntries.guildId, guildId), eq(starboardEntries.messageId, messageId)));
}

// ---------- Rank ----------

// A member's position on the server's level leaderboard (1 = top), or null if they have no data.
export async function getRank(guildId: string, userId: string) {
    const [me] = await db.select().from(guildMembers).where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.userId, userId)));
    if (!me) return null;

    const [above] = await db.select({ n: count() }).from(guildMembers).where(and(
        eq(guildMembers.guildId, guildId),
        sql`(${guildMembers.level} > ${me.level} OR (${guildMembers.level} = ${me.level} AND ${guildMembers.messages} > ${me.messages}))`
    ));
    return { ...me, rank: (above?.n ?? 0) + 1 };
}
