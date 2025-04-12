import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class ServerinfoCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Server Information");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;

        const owner = await guild.fetchOwner();

        const embed = new VortexEmbed()
            .setThumbnail(guild.iconURL() as string)
            .addField("Name", guild.name as string, true)
            .addField("ID", guild.id, true)
            .addField("Owner", owner.user.username, true)
            .addField("Owner ID", owner.id, true)
            .addField("Channels", guild.channels.cache.size.toString(), true)
            .addField("Members", guild.memberCount.toString(), true)
            .addField("Roles", guild.roles.cache.size.toString(), true);

        return ctx.reply({embeds: [embed]});
    }
}