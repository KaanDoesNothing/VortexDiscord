import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class UserinfoCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("User Information")
        .addUserOption((arg) => arg.setName("user").setDescription("User"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;

        const roles = member.roles.cache;

        const embed = new VortexEmbed()
            .setTitle(member.user.username)
            .setThumbnail(member.user.avatarURL({size: 1024}) as string)
            .addField("Name", `@${member.user.username}`, true)
            .addField("ID", member.user.id.toString(), true)
            .addField("Joined", member.joinedAt!.toLocaleString())
            .addField("Created", member.user.createdAt.toLocaleString(), true)
            .setFooter({text: `Roles: ${roles.map(role => `${role.name}`).join(", ")}`});

        return ctx.reply({embeds: [embed]});
    }
}