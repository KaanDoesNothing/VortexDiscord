import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

export class EightBallCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Ask a yes-or-no question and get a random, mystical answer from the magic 8-Ball.")
        .addStringOption((option) => option.setName("question").setRequired(true).setDescription("Question"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const replies = ["Yes", "No", "I didn't get that, please ask again", "Ask me later", "Of Course", "Absolutely not"]

		const result = Math.floor((Math.random() * replies.length));

        return ctx.reply({content: replies[result]});
    }
}