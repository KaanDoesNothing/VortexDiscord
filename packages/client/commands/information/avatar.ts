import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /avatar [user]: full-size avatar, preferring the server-specific one if they set it.
export class AvatarCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Show someone's avatar in full size")
        .addUserOption((arg) => arg.setName("user").setDescription("Whose avatar to show (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;
        const member = ctx.guild?.members.cache.get(user.id);

        // displayAvatarURL also handles default avatars; the member version includes server avatars.
        const url = (member ?? user).displayAvatarURL({ size: 1024 });

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s avatar`)
            .setURL(url)
            .setImage(url);

        return ctx.reply({ embeds: [embed] });
    }
}
