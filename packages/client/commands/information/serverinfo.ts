import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, time } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /serverinfo: overview of the current server.
export class ServerinfoCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Owner, member count, channels, boosts and more about this server");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const channels = guild.channels.cache;

        const embed = new VortexEmbed()
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .addField("Owner", `<@${guild.ownerId}>`, true)
            .addField("Members", guild.memberCount.toLocaleString(), true)
            .addField("Roles", (guild.roles.cache.size - 1).toString(), true)
            .addField("Text channels", channels.filter((c) => c.type === ChannelType.GuildText).size.toString(), true)
            .addField("Voice channels", channels.filter((c) => c.type === ChannelType.GuildVoice).size.toString(), true)
            .addField("Boosts", `${guild.premiumSubscriptionCount ?? 0} (tier ${guild.premiumTier})`, true)
            .addField("Created", time(guild.createdAt, "D"), true)
            .setFooter({ text: `ID: ${guild.id}` });

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
