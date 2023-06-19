import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {CurrencyName, NoUserDBEntry} from "../../lib/Language";
import {UserTable} from "../../lib/Database";
import {economyCategoryName} from "./mod";

export class GambleCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("gamble")
        .setDescription(`Gamble some of your ${CurrencyName}`)
        .addNumberOption((arg) => arg.setName("amount").setDescription("How much do you want to bet?").setRequired(true));

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const amount = ctx.options.getNumber("amount");

        const userData = await UserTable.findOne({user_id: ctx.user.id});

        if(!userData) return {content: NoUserDBEntry};

        if(amount > userData.economy.money.value) {
            await ctx.reply(`You don't have enough ${CurrencyName}`);
            return;
        }

        const won = Math.floor(Math.random() * 2) === 0;

        let msgContent;

        if(!won) {
            userData.economy.money.value -= amount;

            msgContent = `:x: You lost, ${amount} ${CurrencyName} have been taken from your bank account.`;
        }else {
            userData.economy.money.value += amount;

            msgContent = `:white_check_mark: You Won, ${amount} ${CurrencyName} have been added to your bank account.`;
        }

        await userData.save();

        return {content: msgContent};
	}
}