import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const REPLIES = [
    "Yes.", "No.", "Absolutely.", "Absolutely not.", "Of course.", "Without a doubt.",
    "Ask me later.", "I didn't get that, please ask again.", "Don't count on it.",
    "Signs point to yes.", "Very doubtful.", "Better not tell you now."
];

// /8ball <question>: a random magic 8-ball answer.
export class EightBallCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Ask the magic 8-ball a yes-or-no question")
        .addStringOption((option) => option.setName("question").setDescription("A yes-or-no question for the 8-ball").setMaxLength(250).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const question = ctx.options.getString("question", true);
        const answer = REPLIES[Math.floor(Math.random() * REPLIES.length)]!;

        const embed = new VortexEmbed().setTitle("🎱 Magic 8-ball").addField("Question", question).addField("Answer", answer);

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
