import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {DailyEconomyCooldown, DailyEconomyReward} from "../../lib/Constant";
import {economyCategoryName} from "./mod";

export class DailyCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Collect your daily reward");

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user= ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});

        if(!userData) return;

        if((Date.now() - userData.economy.money.cooldown) > DailyEconomyCooldown) {
                userData.economy.money.cooldown = Date.now();
                userData.economy.money.value += DailyEconomyReward;

                await userData.save();

                return {content: "You've collected your daily!"};
        }else {
                return {content: "You've already collected your daily!"};
        }
    }
}