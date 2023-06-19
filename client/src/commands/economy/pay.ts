import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder, User} from "discord.js";
import {UserTable} from "../../lib/Database";
import {CurrencyName, NoUserDBEntry} from "../../lib/Language";
import {economyCategoryName} from "./mod";

export class PayCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Pay someone")
        .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(true))
        .addNumberOption((arg) => arg.setName("amount").setDescription("Amount").setRequired(true))

    category = economyCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user");
        const amount = ctx.options.getNumber("amount");

        if(user.id === ctx.user.id) {
            return {content: "Nice try!"};
        }

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        const targetData = await UserTable.findOne({user_id: user.id});

        if(!targetData || !userData) {
            return {content: NoUserDBEntry};
        }

        if(amount > userData.economy.money.value) {
            return {content: `You don't have enough ${CurrencyName}`};
        } 

        userData.economy.money.value -= amount;
        targetData.economy.money.value += amount;

       await userData.save();
       await targetData.save();

       return {content: `${amount} has been removed from your balance and has been given to ${user.tag}.`};
    }
}