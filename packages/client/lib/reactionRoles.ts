import { and, eq } from "drizzle-orm";
import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { db } from "./database/client";
import { reactionRoles } from "./database/schema";

// Reaction roles: react to a message with an emoji to get a role, remove the reaction to lose it.
// Message IDs that have reaction roles are kept in memory, so other reactions never touch the database.

const messages = new Set<string>();
let loaded = false;

// Custom emoji are stored by ID, unicode emoji as themselves.
export const emojiKey = (emoji: { id: string | null; name: string | null }) => emoji.id ?? emoji.name ?? "";

// Turns what an admin typed ("<:pog:123>", "🔥") into the stored key.
export const parseEmojiInput = (input: string) => input.trim().match(/^<a?:\w+:(\d+)>$/)?.[1] ?? input.trim();

async function ensureLoaded() {
    if (loaded) return;
    const rows = await db.select({ messageId: reactionRoles.messageId }).from(reactionRoles);
    for (const row of rows) messages.add(row.messageId);
    loaded = true;
}

export async function addReactionRole(input: { guildId: string; channelId: string; messageId: string; emoji: string; roleId: string }) {
    await db.insert(reactionRoles).values(input)
        .onConflictDoUpdate({ target: [reactionRoles.messageId, reactionRoles.emoji], set: { roleId: input.roleId } });
    messages.add(input.messageId);
}

export async function removeReactionRole(guildId: string, messageId: string, emoji: string) {
    const rows = await db.delete(reactionRoles)
        .where(and(eq(reactionRoles.guildId, guildId), eq(reactionRoles.messageId, messageId), eq(reactionRoles.emoji, emoji)))
        .returning({ id: reactionRoles.id });
    const left = await db.select({ id: reactionRoles.id }).from(reactionRoles).where(eq(reactionRoles.messageId, messageId)).limit(1);
    if (!left.length) messages.delete(messageId);
    return rows.length > 0;
}

export async function listReactionRoles(guildId: string) {
    return db.select().from(reactionRoles).where(eq(reactionRoles.guildId, guildId)).orderBy(reactionRoles.id);
}

// Called for every reaction add/remove.
export async function handleReactionRole(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, added: boolean) {
    await ensureLoaded();
    if (user.bot || !messages.has(reaction.message.id)) return;

    const [row] = await db.select().from(reactionRoles)
        .where(and(eq(reactionRoles.messageId, reaction.message.id), eq(reactionRoles.emoji, emojiKey(reaction.emoji))))
        .limit(1);
    if (!row) return;

    const guild = reaction.message.guild ?? reaction.client.guilds.cache.get(row.guildId);
    const role = guild?.roles.cache.get(row.roleId);
    if (!guild || !role?.editable || role.managed) return;

    const member = guild.members.cache.get(user.id) ?? await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    if (added && !member.roles.cache.has(role.id)) await member.roles.add(role, "Reaction role").catch(() => null);
    if (!added && member.roles.cache.has(role.id)) await member.roles.remove(role, "Reaction role removed").catch(() => null);
}
