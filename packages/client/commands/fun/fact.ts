import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /fact: a random (useless but true-ish) fact.
export class FactCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["funfact"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Learn a random fun fact");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        await ctx.deferReply();
        try {
            const f = await getJson<{ text: string }>("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
            return ctx.editReply({ embeds: [new VortexEmbed().setTitle("🧠 Did you know?").setDescription(f.text)] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
