import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {nekosLife} from "../../lib/utils/NekosLife";
export class FactCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Fact");

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const fact = (await nekosLife.fact()).fact;

        return {content: `Did you know that: ${fact}`};
    }
}