import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {CurrencyName, NoUserDBEntry} from "../../lib/Language";
import {economyCategoryName} from "./mod";

export class CoinFlipCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Flip a coin")
        .addStringOption((arg) => arg.setName("side").setDescription("Heads or Tails").setRequired(true).addChoices(
            {
                name: "Heads",
                value: "heads"
            },
            {
                name: "Tails",
                value: "tails"
            }
        )).addNumberOption((arg) => arg.setName("amount").setDescription("How much do you want to bet?").setRequired(true));

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const flip = ctx.options.getString("side");
        const amount = ctx.options.getNumber("amount");

        if(!flip || !amount) return;

        const userData = await UserTable.findOne({user_id: ctx.user.id});

        if(!userData) return {content: NoUserDBEntry};
        
        if(amount > userData.economy.money.value) {
            return {content: `You don't have enough ${CurrencyName}`};
        }

        const generatedNumber = Math.floor(Math.random() * 2) === 0;

        const text = generatedNumber ? "heads" : "tails";

        let msgContent;

        if(text !== flip) {
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