import { MessageFlags, type ChatInputCommandInteraction, type Guild, type GuildMember, type GuildTextBasedChannel, type User } from "discord.js";
import { DBManager } from "./database";

// Checks whether the person running a moderation command may act on `target`.
// Returns an error message to show, or null if it's allowed.
//
// Rules: you can't target yourself, the bot, or the server owner, and you can only act on
// members whose highest role is below yours (the owner bypasses this). Whether the *bot*
// can do it (its own role position) is checked separately by each command.
export function checkModerationTarget(ctx: ChatInputCommandInteraction, target: GuildMember | null, targetUser: User | null): string | null {
    if (!targetUser) return "Couldn't find that user.";
    if (targetUser.id === ctx.user.id) return "You can't do that to yourself.";
    if (targetUser.id === ctx.client.user.id) return "Nice try.";

    const guild = ctx.guild!;
    if (targetUser.id === guild.ownerId) return "You can't do that to the server owner.";

    // Not in the server: there's no role to compare.
    if (!target) return null;

    const moderator = (ctx.member as GuildMember | null) ?? guild.members.cache.get(ctx.user.id);
    if (moderator && moderator.id !== guild.ownerId && target.roles.highest.position >= moderator.roles.highest.position) {
        return `You can't do that to ${targetUser.username}: their highest role is the same as or above yours.`;
    }

    return null;
}

// Discord limits audit-log reasons to 512 characters.
export const auditReason = (moderator: User, reason: string) => `${moderator.username}: ${reason}`.slice(0, 512);

// Locks or unlocks a text channel for @everyone (used by /lock and /unlock).
// Only the @everyone overwrite is touched, so other role permissions stay as they were.
// Unlocking sets SendMessages back to "inherit" (null), not "allow", restoring the category/server default.
export async function setChannelLocked(ctx: ChatInputCommandInteraction, locked: boolean) {
    const channel = (ctx.options.getChannel("channel") ?? ctx.channel) as GuildTextBasedChannel | null;
    const reason = ctx.options.getString("reason");
    if (!channel || !("permissionOverwrites" in channel)) return ctx.reply({ content: "That channel can't be locked.", flags: MessageFlags.Ephemeral });

    await channel.permissionOverwrites.edit(ctx.guild!.roles.everyone, { SendMessages: locked ? false : null }, { reason: auditReason(ctx.user, reason ?? (locked ? "Locked" : "Unlocked")) });

    const notice = locked ? `🔒 This channel has been locked.${reason ? ` Reason: ${reason}` : ""}` : "🔓 This channel has been unlocked.";
    if (channel.id !== ctx.channelId) await channel.send(notice).catch(() => null);

    return ctx.reply({ content: channel.id === ctx.channelId ? notice : `${channel} has been ${locked ? "locked" : "unlocked"}.` });
}

// The member for a user ID, from the cache or Discord. On big servers most members aren't cached,
// so cache-only lookups wrongly report "not in this server".
export async function fetchMember(guild: Guild, userId: string): Promise<GuildMember | null> {
    return guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
}

// The reason given to a moderation command. Returns null when the server requires a reason
// (Dashboard → Moderation → "Require a reason") and none was given.
export async function moderationReason(ctx: ChatInputCommandInteraction): Promise<string | null> {
    const given = ctx.options.getString("reason")?.trim();
    if (given) return given;
    const { settings } = await DBManager.getGuildConfig(ctx.guildId!);
    return settings.moderation.requireReason ? null : "None";
}

export const REASON_REQUIRED = "This server requires a reason for moderation actions. Add one with the `reason` option.";
