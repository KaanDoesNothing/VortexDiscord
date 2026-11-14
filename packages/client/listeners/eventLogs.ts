import { Events, Listener } from "@sapphire/framework";
import type { GuildMember, GuildTextBasedChannel, Message, PartialGuildMember, PartialMessage, ReadonlyCollection, Snowflake, VoiceState } from "discord.js";
import { clip, sendLog } from "../lib/eventlog";
import { VortexEmbed } from "../lib/structures/embed";

// Event logs: each listener posts to the matching log channel chosen in the dashboard
// (Moderation → Event logs). Join/leave logs live in guildMemberAdd/guildMemberRemove.

// ----- Messages -----

export class MessageDeleteLog extends Listener<typeof Events.MessageDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogMessageDelete", event: Events.MessageDelete });
    }

    public async run(message: Message | PartialMessage) {
        // Partial = sent before the bot started; we never saw its content.
        if (!message.inGuild() || message.author?.bot) return;

        const embed = new VortexEmbed()
            .setColor(0xe5484d)
            .setTitle("Message deleted")
            .setDescription(`In ${message.channel}${message.author ? ` by ${message.author}` : ""}`)
            .addField("Content", clip(message.content ?? "*(unknown: sent before the bot was online)*"));

        if (message.attachments?.size) embed.addField("Attachments", clip(message.attachments.map((a) => a.name).join(", ")));
        if (message.author) embed.setFooter({ text: `User ID: ${message.author.id}`, iconURL: message.author.displayAvatarURL() });

        await sendLog(message.guild, "messages", embed);
    }
}

export class MessageBulkDeleteLog extends Listener<typeof Events.MessageBulkDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogMessageBulkDelete", event: Events.MessageBulkDelete });
    }

    public async run(messages: ReadonlyCollection<Snowflake, Message<true> | PartialMessage<true>>, channel: GuildTextBasedChannel) {
        await sendLog(channel.guild, "messages", new VortexEmbed()
            .setColor(0xe5484d)
            .setTitle("Messages bulk-deleted")
            .setDescription(`${messages.size} messages removed in ${channel}`));
    }
}

export class MessageUpdateLog extends Listener<typeof Events.MessageUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogMessageUpdate", event: Events.MessageUpdate });
    }

    public async run(before: Message | PartialMessage, after: Message | PartialMessage) {
        // Embeds loading also fires an "update"; only log real content edits.
        if (!after.inGuild() || after.author?.bot || before.content === after.content || before.content == null) return;

        await sendLog(after.guild, "messages", new VortexEmbed()
            .setColor(0xf5c542)
            .setTitle("Message edited")
            .setDescription(`In ${after.channel} by ${after.author} · [Jump to message](${after.url})`)
            .addField("Before", clip(before.content))
            .addField("After", clip(after.content ?? ""))
            .setFooter({ text: `User ID: ${after.author?.id}` }));
    }
}

// ----- Roles and nicknames (needs the Server Members intent) -----

export class MemberUpdateLog extends Listener<typeof Events.GuildMemberUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogMemberUpdate", event: Events.GuildMemberUpdate });
    }

    public async run(before: GuildMember | PartialGuildMember, after: GuildMember) {
        if (before.partial) return;

        const added = after.roles.cache.filter((r) => !before.roles.cache.has(r.id));
        const removed = before.roles.cache.filter((r) => !after.roles.cache.has(r.id));
        const nickChanged = before.nickname !== after.nickname;
        if (!added.size && !removed.size && !nickChanged) return;

        const embed = new VortexEmbed()
            .setTitle("Member updated")
            .setDescription(`${after} (${after.user.tag})`)
            .setThumbnail(after.displayAvatarURL());

        if (added.size) embed.addField("Roles added", added.map((r) => `${r}`).join(" "));
        if (removed.size) embed.addField("Roles removed", removed.map((r) => `${r}`).join(" "));
        if (nickChanged) embed.addField("Nickname", `${before.nickname ?? "*(none)*"} → ${after.nickname ?? "*(none)*"}`);

        await sendLog(after.guild, "roles", embed);
    }
}

// ----- Voice -----

export class VoiceStateLog extends Listener<typeof Events.VoiceStateUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "LogVoiceState", event: Events.VoiceStateUpdate });
    }

    public async run(before: VoiceState, after: VoiceState) {
        if (before.channelId === after.channelId || after.member?.user.bot) return;
        const who = `${after.member ?? `<@${after.id}>`}`;

        const description = !before.channelId
            ? `${who} joined ${after.channel}`
            : !after.channelId
                ? `${who} left ${before.channel}`
                : `${who} moved from ${before.channel} to ${after.channel}`;

        await sendLog(after.guild, "voice", new VortexEmbed()
            .setColor(!after.channelId ? 0x8e8c99 : 0x30a46c)
            .setTitle("Voice")
            .setDescription(description));
    }
}
