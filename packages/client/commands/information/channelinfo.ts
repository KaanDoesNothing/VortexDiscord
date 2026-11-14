import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, time, type GuildBasedChannel } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const TYPES: Partial<Record<ChannelType, string>> = {
    [ChannelType.GuildText]: "Text", [ChannelType.GuildVoice]: "Voice", [ChannelType.GuildCategory]: "Category",
    [ChannelType.GuildAnnouncement]: "Announcement", [ChannelType.GuildStageVoice]: "Stage", [ChannelType.GuildForum]: "Forum",
    [ChannelType.PublicThread]: "Thread", [ChannelType.PrivateThread]: "Private thread", [ChannelType.GuildMedia]: "Media"
};

// /channelinfo [channel]: details about a channel.
export class ChannelInfoCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["channel"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("Details about a channel: type, topic, slowmode, creation date")
        .addChannelOption((o) => o.setName("channel").setDescription("Which channel (defaults to this one)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const channel = (ctx.options.getChannel("channel") ?? ctx.channel) as GuildBasedChannel;

        const embed = new VortexEmbed()
            .setTitle(`#${channel.name}`)
            .addField("Type", TYPES[channel.type] ?? "Other", true)
            .addField("ID", channel.id, true)
            .addField("Created", time(channel.createdAt!, "R"), true);

        if (channel.parent) embed.addField("Category", channel.parent.name, true);
        if ("topic" in channel && channel.topic) embed.setDescription(channel.topic.slice(0, 1000));
        if ("rateLimitPerUser" in channel && channel.rateLimitPerUser) embed.addField("Slowmode", `${channel.rateLimitPerUser}s`, true);
        if ("nsfw" in channel && channel.nsfw) embed.addField("Age-restricted", "Yes", true);
        if ("members" in channel && channel.isVoiceBased()) embed.addField("Connected", channel.members.size.toString(), true);
        if ("bitrate" in channel) embed.addField("Bitrate", `${Math.round(channel.bitrate / 1000)} kbps`, true);

        return ctx.reply({ embeds: [embed] });
    }
}
