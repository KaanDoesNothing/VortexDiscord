import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Joke { type: "single" | "twopart"; joke?: string; setup?: string; delivery?: string; category: string }

// /joke [category]: a random safe-for-work joke (JokeAPI, safe mode).
export class JokeCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Tell a random (clean) joke")
        .addStringOption((o) => o.setName("category").setDescription("Kind of joke").addChoices(
            { name: "Any", value: "Any" }, { name: "Programming", value: "Programming" }, { name: "Puns", value: "Pun" },
            { name: "Misc", value: "Misc" }, { name: "Spooky", value: "Spooky" }, { name: "Christmas", value: "Christmas" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const category = ctx.options.getString("category") ?? "Any";
        await ctx.deferReply();

        try {
            const j = await getJson<Joke>(`https://v2.jokeapi.dev/joke/${category}?safe-mode`);
            // Two-part jokes hide the punchline behind a spoiler.
            const text = j.type === "single" ? j.joke! : `${j.setup}\n\n||${j.delivery}||`;
            return ctx.editReply({ embeds: [new VortexEmbed().setTitle(`😂 ${j.category} joke`).setDescription(text)] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
