import { Events, Listener } from "@sapphire/framework";
import { AuditLogEvent, ChannelType, type DMChannel, type Emoji, type GuildBan, type Guild, type GuildBasedChannel, type GuildEmoji, type Invite, type NonThreadGuildBasedChannel, type Role } from "discord.js";
import { sendLog } from "../lib/eventlog";
import { forgetInvite, rememberInvite } from "../lib/invites";
import { Colors, VortexEmbed } from "../lib/structures/embed";

// Server, moderation and invite logs (Dashboard → Moderation → Event logs). Bans are also logged when
// they're done in Discord itself, not through the bot; the audit log tells us who did it.

const channelKind = (c: GuildBasedChannel) => (c.type === ChannelType.GuildCategory ? "Category" : c.isVoiceBased() ? "Voice channel" : c.isThread() ? "Thread" : "Channel");

// Who did something, from the audit log (needs View Audit Log; otherwise unknown).
async function executor(guild: Guild, type: AuditLogEvent, targetId: string) {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 }).catch(() => null);
    const entry = logs?.entries.find((e) => (e.target as { id?: string } | null)?.id === targetId && Date.now() - e.createdTimestamp < 15_000);
    return entry ? { user: entry.executor, reason: entry.reason } : null;
}

// ----- Channels -----

export class ChannelCreateLog extends Listener<typeof Events.ChannelCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogChannelCreate", event: Events.ChannelCreate });
    }
    public async run(channel: NonThreadGuildBasedChannel) {
        await sendLog(channel.guild, "server", new VortexEmbed(channel.guild.id).setColor(Colors.success).setTitle(`${channelKind(channel)} created`)
            .setDescription(`${channel} (\`${channel.name}\`)${channel.parent ? ` in **${channel.parent.name}**` : ""}`));
    }
}

export class ChannelDeleteLog extends Listener<typeof Events.ChannelDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogChannelDelete", event: Events.ChannelDelete });
    }
    public async run(channel: DMChannel | NonThreadGuildBasedChannel) {
        if (!("guild" in channel) || !channel.guild) return;
        await sendLog(channel.guild, "server", new VortexEmbed(channel.guild.id).setColor(Colors.danger).setTitle(`${channelKind(channel)} deleted`)
            .setDescription(`\`${channel.name}\`${channel.parent ? ` in **${channel.parent.name}**` : ""}`));
    }
}

export class ChannelUpdateLog extends Listener<typeof Events.ChannelUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogChannelUpdate", event: Events.ChannelUpdate });
    }
    public async run(before: DMChannel | NonThreadGuildBasedChannel, after: DMChannel | NonThreadGuildBasedChannel) {
        if (!("guild" in after) || !after.guild || !("guild" in before)) return;
        const changes: string[] = [];
        if (before.name !== after.name) changes.push(`Name: \`${before.name}\` → \`${after.name}\``);
        if ("topic" in before && "topic" in after && before.topic !== after.topic) changes.push(`Topic changed`);
        if ("nsfw" in before && "nsfw" in after && before.nsfw !== after.nsfw) changes.push(`Age-restricted: ${after.nsfw ? "on" : "off"}`);
        if ("rateLimitPerUser" in before && "rateLimitPerUser" in after && before.rateLimitPerUser !== after.rateLimitPerUser) changes.push(`Slowmode: ${before.rateLimitPerUser ?? 0}s → ${after.rateLimitPerUser ?? 0}s`);
        if ("permissionOverwrites" in before && "permissionOverwrites" in after && !before.permissionOverwrites.cache.equals(after.permissionOverwrites.cache)) changes.push("Permissions changed");
        if (!changes.length) return;
        await sendLog(after.guild, "server", new VortexEmbed(after.guild.id).setColor(Colors.warning).setTitle(`${channelKind(after)} updated`)
            .setDescription(`${after}\n${changes.join("\n")}`));
    }
}

// ----- Roles -----

export class RoleCreateLog extends Listener<typeof Events.GuildRoleCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogRoleCreate", event: Events.GuildRoleCreate });
    }
    public async run(role: Role) {
        await sendLog(role.guild, "server", new VortexEmbed(role.guild.id).setColor(Colors.success).setTitle("Role created").setDescription(`${role} (\`${role.name}\`)`));
    }
}

export class RoleDeleteLog extends Listener<typeof Events.GuildRoleDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogRoleDelete", event: Events.GuildRoleDelete });
    }
    public async run(role: Role) {
        await sendLog(role.guild, "server", new VortexEmbed(role.guild.id).setColor(Colors.danger).setTitle("Role deleted").setDescription(`\`${role.name}\``));
    }
}

export class RoleUpdateLog extends Listener<typeof Events.GuildRoleUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogRoleUpdate", event: Events.GuildRoleUpdate });
    }
    public async run(before: Role, after: Role) {
        const changes: string[] = [];
        if (before.name !== after.name) changes.push(`Name: \`${before.name}\` → \`${after.name}\``);
        if (before.hexColor !== after.hexColor) changes.push(`Color: ${before.hexColor} → ${after.hexColor}`);
        if (before.hoist !== after.hoist) changes.push(`Shown separately: ${after.hoist ? "yes" : "no"}`);
        if (before.mentionable !== after.mentionable) changes.push(`Mentionable: ${after.mentionable ? "yes" : "no"}`);
        if (!before.permissions.equals(after.permissions)) {
            const added = after.permissions.toArray().filter((p) => !before.permissions.has(p));
            const removed = before.permissions.toArray().filter((p) => !after.permissions.has(p));
            if (added.length) changes.push(`Permissions added: ${added.join(", ")}`);
            if (removed.length) changes.push(`Permissions removed: ${removed.join(", ")}`);
        }
        if (!changes.length) return;
        await sendLog(after.guild, "server", new VortexEmbed(after.guild.id).setColor(Colors.warning).setTitle("Role updated").setDescription(`${after}\n${changes.join("\n")}`.slice(0, 4000)));
    }
}

// ----- Emojis -----

export class EmojiCreateLog extends Listener<typeof Events.GuildEmojiCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogEmojiCreate", event: Events.GuildEmojiCreate });
    }
    public async run(emoji: GuildEmoji) {
        await sendLog(emoji.guild, "server", new VortexEmbed(emoji.guild.id).setColor(Colors.success).setTitle("Emoji added").setDescription(`${emoji} \`:${emoji.name}:\``).setThumbnail(emoji.imageURL()));
    }
}

export class EmojiDeleteLog extends Listener<typeof Events.GuildEmojiDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogEmojiDelete", event: Events.GuildEmojiDelete });
    }
    public async run(emoji: GuildEmoji) {
        await sendLog(emoji.guild, "server", new VortexEmbed(emoji.guild.id).setColor(Colors.danger).setTitle("Emoji removed").setDescription(`\`:${emoji.name}:\``).setThumbnail((emoji as Emoji).imageURL()));
    }
}

// ----- Server -----

export class GuildUpdateLog extends Listener<typeof Events.GuildUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogGuildUpdate", event: Events.GuildUpdate });
    }
    public async run(before: Guild, after: Guild) {
        const changes: string[] = [];
        if (before.name !== after.name) changes.push(`Name: **${before.name}** → **${after.name}**`);
        if (before.icon !== after.icon) changes.push("Icon changed");
        if (before.banner !== after.banner) changes.push("Banner changed");
        if (before.verificationLevel !== after.verificationLevel) changes.push(`Verification level: ${before.verificationLevel} → ${after.verificationLevel}`);
        if (before.vanityURLCode !== after.vanityURLCode) changes.push(`Vanity URL: ${before.vanityURLCode ?? "none"} → ${after.vanityURLCode ?? "none"}`);
        if (before.ownerId !== after.ownerId) changes.push(`Owner: <@${before.ownerId}> → <@${after.ownerId}>`);
        if (!changes.length) return;
        await sendLog(after, "server", new VortexEmbed(after.id).setColor(Colors.warning).setTitle("Server updated").setDescription(changes.join("\n")).setThumbnail(after.iconURL()));
    }
}

// ----- Bans -----

export class BanAddLog extends Listener<typeof Events.GuildBanAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogBanAdd", event: Events.GuildBanAdd });
    }
    public async run(ban: GuildBan) {
        const by = await executor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        await sendLog(ban.guild, "moderation", new VortexEmbed(ban.guild.id).setColor(Colors.danger).setTitle("Member banned")
            .setThumbnail(ban.user.displayAvatarURL())
            .setDescription(`${ban.user} (${ban.user.tag})`)
            .addField("By", by?.user ? `${by.user}` : "Unknown", true)
            .addField("Reason", (by?.reason ?? ban.reason ?? "None").slice(0, 1024), true)
            .setFooter({ text: `User ID: ${ban.user.id}` }));
    }
}

export class BanRemoveLog extends Listener<typeof Events.GuildBanRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogBanRemove", event: Events.GuildBanRemove });
    }
    public async run(ban: GuildBan) {
        const by = await executor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
        await sendLog(ban.guild, "moderation", new VortexEmbed(ban.guild.id).setColor(Colors.success).setTitle("Member unbanned")
            .setDescription(`${ban.user} (${ban.user.tag})`)
            .addField("By", by?.user ? `${by.user}` : "Unknown", true)
            .setFooter({ text: `User ID: ${ban.user.id}` }));
    }
}

// ----- Invites (also keeps invite tracking up to date) -----

export class InviteCreateLog extends Listener<typeof Events.InviteCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogInviteCreate", event: Events.InviteCreate });
    }
    public async run(invite: Invite) {
        rememberInvite(invite);
        const guild = invite.guild && "members" in invite.guild ? invite.guild as Guild : null;
        if (!guild) return;
        await sendLog(guild, "invites", new VortexEmbed(guild.id).setColor(Colors.success).setTitle("Invite created")
            .setDescription(`\`${invite.code}\`${invite.channel ? ` for ${invite.channel}` : ""}${invite.inviter ? ` by ${invite.inviter}` : ""}`)
            .addField("Expires", invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Never", true)
            .addField("Max uses", invite.maxUses ? String(invite.maxUses) : "Unlimited", true));
    }
}

export class InviteDeleteLog extends Listener<typeof Events.InviteDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogInviteDelete", event: Events.InviteDelete });
    }
    public async run(invite: Invite) {
        forgetInvite(invite);
        const guild = invite.guild && "members" in invite.guild ? invite.guild as Guild : null;
        if (!guild) return;
        await sendLog(guild, "invites", new VortexEmbed(guild.id).setColor(Colors.muted).setTitle("Invite deleted").setDescription(`\`${invite.code}\``));
    }
}
