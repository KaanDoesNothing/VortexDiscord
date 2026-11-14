import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { ApiError, apiErrorMessage, getJson, truncate } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Entry {
    word: string;
    phonetic?: string;
    meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[]; synonyms?: string[] }[];
    sourceUrls?: string[];
}

// /define <word>: dictionary definitions (Free Dictionary API).
export class DefineCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["dictionary", "dict"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("define")
        .setDescription("Look up the meaning of an English word")
        .addStringOption((o) => o.setName("word").setDescription("The word to define").setMaxLength(60).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const word = ctx.options.getString("word", true).trim().toLowerCase();
        await ctx.deferReply();

        try {
            const [entry] = await getJson<Entry[]>(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { cacheMs: 86_400_000 });
            if (!entry) return ctx.editReply(`No definition found for "${word}".`);

            const embed = new VortexEmbed().setTitle(`📖 ${entry.word}`).setDescription(entry.phonetic ? `*${entry.phonetic}*` : null);

            // Up to 3 parts of speech, 2 definitions each.
            for (const meaning of entry.meanings.slice(0, 3)) {
                const lines = meaning.definitions.slice(0, 2).map((d, i) => `**${i + 1}.** ${d.definition}${d.example ? `\n> *${d.example}*` : ""}`);
                if (meaning.synonyms?.length) lines.push(`Synonyms: ${meaning.synonyms.slice(0, 5).join(", ")}`);
                embed.addField(meaning.partOfSpeech, truncate(lines.join("\n"), 1000));
            }

            if (entry.sourceUrls?.[0]) embed.setURL(entry.sourceUrls[0]);
            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(error instanceof ApiError && error.message === "Nothing found." ? `No definition found for "${word}".` : apiErrorMessage(error));
        }
    }
}
