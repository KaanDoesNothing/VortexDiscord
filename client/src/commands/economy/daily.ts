import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {DailyEconomyCooldown, DailyEconomyReward} from "../../lib/Constant";
import {economyCategoryName} from "./mod";

export class DailyCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Collect your daily reward");

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user= ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});

        if(!userData) return;

        if((Date.now() - userData.economy.money.cooldown) > DailyEconomyCooldown) {
                userData.economy.money.cooldown = Date.now();
                userData.economy.money.value += DailyEconomyReward;

                await userData.save();

                await ctx.reply("You've collected your daily!");
        }else {
                await ctx.reply({content: "You've already collected your daily!"});
        }
    }
}