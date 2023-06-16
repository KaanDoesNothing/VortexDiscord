import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {nekosLife} from "../../lib/utils/NekosLife";
export class FactCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Fact");

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const fact = (await nekosLife.fact()).fact;

        await ctx.reply(`Did you know that: ${fact}`);
    }
}