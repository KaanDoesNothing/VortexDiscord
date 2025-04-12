import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class AvatarCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Avatar")
        .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(false));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;
    
        const embed = new VortexEmbed()
            .setTitle(`${member.user?.tag}'s Avatar`)
            .setImage(member.user?.avatarURL({size: 1024}));
        
        return ctx.reply({embeds: [embed]});
    }
}