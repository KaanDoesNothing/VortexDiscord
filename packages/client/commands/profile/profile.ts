import {Command} from '@sapphire/framework';
import {EmbedBuilder, GuildMember, SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { CurrencyName } from '../../lib/constant';
import { DBManager } from '../../lib/database';
import { VortexEmbed } from '../../lib/structures/embed';

export class ProfileCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Profile")
        .addUserOption(option => option.setName("member").setDescription("member"));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("member") as GuildMember || ctx.member;

        const userData = await DBManager.getUser(member.user.id);
        const userGuildData = await DBManager.getGuildUser(ctx.guild!.id, member.user.id);
        
        const embed = new VortexEmbed()
            .setAuthor({name: member.user.tag, iconURL: member.user.avatarURL()!})
            .setImage(member.user.avatarURL())
            .addField(CurrencyName, userData.economy!.balance.toString(), true)
            .addField("Server Level", userGuildData.profile!.experience!.level.toString(), true)
            .addField("\u200b", "\u200b", false)
            .addField("Likes", userData.profile!.likes.toString(), true)
            .addField("Dislikes", userData.profile!.dislikes.toString(), true)
            .setFooter({text: `Bio: ${userData.profile!.description}`});

        return ctx.reply({embeds: [embed]});
    }
}