import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {GuildUserTable, UserTable} from "../../lib/Database";
import {CurrencyName, NoUserDBEntry} from "../../lib/Language";
import {VortexEmbed} from "../../lib/structures/Embed";
import {socialCategoryName} from "./mod";

export class ProfileCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Profile")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = socialCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user") || ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});
        const userGuildData = await GuildUserTable.findOne({guild_id: ctx.guild?.id, user_id: user.id});

        if(!userData) {
            await ctx.reply(NoUserDBEntry);
            return;
        }

        const embed = new VortexEmbed()
            .setAuthor({name: user.tag, iconURL: user.avatarURL()})
            .setImage(user.avatarURL())
            .addField(CurrencyName, userData.economy.money.value.toString(), true)
            .addField("Server Level", userGuildData.economy.experience.level.toString(), true)
            .addField("\u200b", "\u200b", false)
            .addField("Likes", userData.profile.likes.toString(), true)
            .addField("Dislikes", userData.profile.dislikes.toString(), true)
            .setFooter({text: `Bio: ${userData.profile.description}`});

        await ctx.reply({embeds: [embed]});
    }
}