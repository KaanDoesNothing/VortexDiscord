import { container } from "@sapphire/framework";
import { PermissionFlagsBits, type Guild, type GuildMember, type Invite } from "discord.js";
import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./database/client";
import { inviteJoins } from "./database/schema";

// Invite tracking: who invited each new member.
//
// Discord doesn't say which invite someone used, so we keep each server's invite use counts in memory
// and, when someone joins, look for the invite whose count went up. Needs the Manage Server permission
// (to list invites) and the Guild Invites intent (to hear about new/deleted invites).

type Snapshot = Map<string, { uses: number; inviterId: string | null }>;
const snapshots = new Map<string, Snapshot>();

const canTrack = (guild: Guild) => guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

export async function snapshotInvites(guild: Guild) {
    if (!canTrack(guild)) return;
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return;
    const snap: Snapshot = new Map();
    for (const invite of invites.values()) snap.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviterId });
    if (guild.vanityURLCode) {
        const vanity = await guild.fetchVanityData().catch(() => null);
        if (vanity) snap.set(guild.vanityURLCode, { uses: vanity.uses, inviterId: null });
    }
    snapshots.set(guild.id, snap);
}

// On startup: snapshot every server, a few per second so we don't hit rate limits.
export async function snapshotAllInvites() {
    for (const guild of container.client.guilds.cache.values()) {
        await snapshotInvites(guild);
        await Bun.sleep(250);
    }
}

export function rememberInvite(invite: Invite) {
    if (!invite.guild) return;
    snapshots.get(invite.guild.id)?.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviterId });
}

export function forgetInvite(invite: Invite) {
    if (invite.guild) snapshots.get(invite.guild.id)?.delete(invite.code);
}

// Works out which invite a new member used and records it. Returns the inviter (null if unknown).
export async function trackJoin(member: GuildMember): Promise<{ inviterId: string | null; code: string | null }> {
    const guild = member.guild;
    const before = snapshots.get(guild.id);
    await snapshotInvites(guild);
    const after = snapshots.get(guild.id);

    let used: { code: string; inviterId: string | null } | null = null;
    if (before && after) {
        for (const [code, now] of after) {
            const old = before.get(code)?.uses ?? 0;
            if (now.uses > old) { used = { code, inviterId: now.inviterId }; break; }
        }
        // A one-use invite disappears once used.
        if (!used) {
            for (const [code, old] of before) if (!after.has(code)) { used = { code, inviterId: old.inviterId }; break; }
        }
    }

    await db.insert(inviteJoins).values({ guildId: guild.id, userId: member.id, inviterId: used?.inviterId ?? null, code: used?.code ?? null }).catch(() => null);
    return { inviterId: used?.inviterId ?? null, code: used?.code ?? null };
}

export async function trackLeave(guildId: string, userId: string) {
    await db.update(inviteJoins).set({ leftAt: new Date() })
        .where(and(eq(inviteJoins.guildId, guildId), eq(inviteJoins.userId, userId), isNull(inviteJoins.leftAt)))
        .catch(() => null);
}

// How many people someone brought in: total joins, and how many are still here.
export async function inviteStats(guildId: string, inviterId: string) {
    const [row] = await db.select({
        total: count(),
        left: sql<number>`count(*) filter (where ${inviteJoins.leftAt} is not null)`.mapWith(Number)
    }).from(inviteJoins).where(and(eq(inviteJoins.guildId, guildId), eq(inviteJoins.inviterId, inviterId)));
    const total = row?.total ?? 0;
    const left = row?.left ?? 0;
    return { total, left, current: total - left };
}

// Who brought in the most members that are still here.
export async function inviteLeaderboard(guildId: string, limit = 10) {
    return db.select({ inviterId: inviteJoins.inviterId, current: count() })
        .from(inviteJoins)
        .where(and(eq(inviteJoins.guildId, guildId), isNotNull(inviteJoins.inviterId), isNull(inviteJoins.leftAt)))
        .groupBy(inviteJoins.inviterId)
        .orderBy(desc(count()))
        .limit(limit);
}

// Who invited a given member (latest join).
export async function invitedBy(guildId: string, userId: string) {
    const [row] = await db.select().from(inviteJoins)
        .where(and(eq(inviteJoins.guildId, guildId), eq(inviteJoins.userId, userId)))
        .orderBy(desc(inviteJoins.createdAt)).limit(1);
    return row ?? null;
}
