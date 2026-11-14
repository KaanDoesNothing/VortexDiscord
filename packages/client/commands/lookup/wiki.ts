import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson, truncate } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Search { pages?: { key: string; title: string }[] }
interface Summary { title: string; extract: string; description?: string; type: string; thumbnail?: { source: string }; content_urls?: { desktop: { page: string } } }

// /wiki <topic>: the summary of the best-matching Wikipedia article.
export class WikiCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["wikipedia"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("wiki")
        .setDescription("Look up a topic on Wikipedia")
        .addStringOption((o) => o.setName("topic").setDescription("What to look up").setMaxLength(200).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const topic = ctx.options.getString("topic", true);
        await ctx.deferReply();

        try {
            // Search first, so typos and loose phrasing still find the right article.
            const search = await getJson<Search>(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(topic)}&limit=1`, { cacheMs: 3_600_000 });
            const page = search.pages?.[0];
            if (!page) return ctx.editReply(`No Wikipedia article found for "${topic}".`);

            const s = await getJson<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`, { cacheMs: 3_600_000 });

            const embed = new VortexEmbed()
                .setTitle(s.title)
                .setURL(s.content_urls?.desktop.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`)
                .setDescription(truncate(s.extract || "No summary available.", 1500))
                .setFooter({ text: s.type === "disambiguation" ? "This term has several meanings: open the page to pick one" : `Wikipedia${s.description ? ` · ${s.description}` : ""}` });

            if (s.thumbnail) embed.setThumbnail(s.thumbnail.source);
            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
