import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";

export class EightBallCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Hmmm")
        .addStringOption((arg) => arg.setName("question").setRequired(true).setDescription("Question"));

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const replies = ["Yes", "No", "I didn't get that, please ask again", "Ask me later", "Of Course", "Absolutely not"]

		const result = Math.floor((Math.random() * replies.length));

		await ctx.reply(replies[result]);
    }
}