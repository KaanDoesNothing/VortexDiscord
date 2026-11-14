import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { getCurrency } from "../../lib/economy";
import { apiErrorMessage, getJson } from "../../lib/http";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Question { category: string; difficulty: "easy" | "medium" | "hard"; question: string; correct_answer: string; incorrect_answers: string[] }

// Coins for a correct answer, by difficulty.
const REWARD = { easy: 25, medium: 50, hard: 100 };

// Open Trivia DB returns HTML entities ("&quot;" etc.).
const decode = (s: string) => s.replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&eacute;/g, "é").replace(/&[a-z]+;/g, "");

// /trivia [difficulty]: a multiple-choice question with buttons. Answer right within 20 seconds to earn coins.
export class TriviaCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["quiz"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("trivia")
        .setDescription("Answer a trivia question; get it right to win coins")
        .addStringOption((o) => o.setName("difficulty").setDescription("How hard").addChoices(
            { name: "Easy (25 coins)", value: "easy" }, { name: "Medium (50 coins)", value: "medium" }, { name: "Hard (100 coins)", value: "hard" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const difficulty = ctx.options.getString("difficulty");
        const currency = await getCurrency(ctx.guildId);

        let q: Question;
        try {
            const data = await getJson<{ results: Question[] }>(`https://opentdb.com/api.php?amount=1&type=multiple${difficulty ? `&difficulty=${difficulty}` : ""}`);
            if (!data.results[0]) throw new Error();
            q = data.results[0];
        } catch (error) {
            return ctx.reply({ content: apiErrorMessage(error), ephemeral: true });
        }

        const answers = [q.correct_answer, ...q.incorrect_answers].map(decode).sort(() => Math.random() - 0.5);
        const correct = answers.indexOf(decode(q.correct_answer));
        const letters = ["A", "B", "C", "D"];

        const embed = new VortexEmbed()
            .setTitle(`❓ ${decode(q.category)} · ${q.difficulty}`)
            .setDescription(`**${decode(q.question)}**\n\n${answers.map((a, i) => `**${letters[i]}.** ${a}`).join("\n")}`)
            .setFooter({ text: `20 seconds · correct answer wins ${REWARD[q.difficulty]} ${currency.name}` });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            answers.map((_, i) => new ButtonBuilder().setCustomId(String(i)).setLabel(letters[i]!).setStyle(ButtonStyle.Primary))
        );

        const message = await replyAndFetch(ctx, { embeds: [embed], components: [row] });
        const click = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 20_000 }).catch(() => null);

        // Show the right answer in green, a wrong pick in red.
        const reveal = (picked: number | null) => new ActionRowBuilder<ButtonBuilder>().addComponents(
            answers.map((_, i) => new ButtonBuilder().setCustomId(String(i)).setLabel(letters[i]!).setDisabled(true)
                .setStyle(i === correct ? ButtonStyle.Success : i === picked ? ButtonStyle.Danger : ButtonStyle.Secondary))
        );

        if (!click) {
            return message.edit({ embeds: [embed.setFooter({ text: `⏱️ Time's up! It was ${letters[correct]}: ${answers[correct]}` })], components: [reveal(null)] }).catch(() => null);
        }

        const picked = Number(click.customId);
        if (picked === correct) {
            await DBManager.adjustBalance(ctx.user.id, REWARD[q.difficulty]);
            return click.update({ embeds: [embed.setColor(0x30a46c).setFooter({ text: `✅ Correct! +${REWARD[q.difficulty]} ${currency.name}` })], components: [reveal(picked)] });
        }
        return click.update({ embeds: [embed.setColor(0xe5484d).setFooter({ text: `❌ Wrong! It was ${letters[correct]}: ${answers[correct]}` })], components: [reveal(picked)] });
    }
}
