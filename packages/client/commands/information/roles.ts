import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class RolesCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("roles")
        .setDescription("Server Roles");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;

        const owner = await guild.fetchOwner();

        const embed = new VortexEmbed()
            .setThumbnail(guild.iconURL() as string)
            .setTitle("Server Roles")
            .setDescription(`${guild.roles.cache.map(role => `<@&${role.id}>`).join(", ")}`)
            .setFooter({text: `Roles: ${guild.roles.cache.size}`})

        return ctx.reply({embeds: [embed]});
    }
}