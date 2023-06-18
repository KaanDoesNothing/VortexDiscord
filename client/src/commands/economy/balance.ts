import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder, User} from "discord.js";
import {UserTable} from "../../lib/Database";
import {CurrencyName, NoUserDBEntry} from "../../lib/Language";
import {economyCategoryName} from "./mod";

export class BalanceCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Balance")
        .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(false));

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user: User = ctx.options.getUser("user") || ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});

        if(!userData) {
            await ctx.reply(NoUserDBEntry);
            return;
        }

       await ctx.reply(`${user.id === ctx.user.id ? "You have" : `${user.tag} has`} ${userData.economy.money.value} ${CurrencyName}.`);
    }
}