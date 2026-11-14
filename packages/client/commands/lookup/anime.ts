import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { truncate } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Media {
    title: { romaji: string; english: string | null };
    siteUrl: string;
    description: string | null;
    coverImage: { large: string; color: string | null };
    averageScore: number | null;
    episodes: number | null;
    chapters: number | null;
    status: string;
    format: string | null;
    genres: string[];
    seasonYear: number | null;
}

const QUERY = `query ($search: String, $type: MediaType) {
  Media(search: $search, type: $type, isAdult: false, sort: SEARCH_MATCH) {
    title { romaji english } siteUrl description(asHtml: false) coverImage { large color }
    averageScore episodes chapters status format genres seasonYear
  }
}`;

// /anime <title> [type]: anime or manga info from AniList (adult titles are excluded).
export class AnimeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["manga"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("anime")
        .setDescription("Look up an anime or manga: score, episodes, genres and synopsis")
        .addStringOption((o) => o.setName("title").setDescription("What to search for").setMaxLength(100).setRequired(true))
        .addStringOption((o) => o.setName("type").setDescription("Anime or manga").addChoices({ name: "Anime", value: "ANIME" }, { name: "Manga", value: "MANGA" }));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const title = ctx.options.getString("title", true);
        const type = ctx.options.getString("type") ?? "ANIME";
        await ctx.deferReply();

        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ query: QUERY, variables: { search: title, type } }),
            signal: AbortSignal.timeout(8000)
        }).catch(() => null);

        const body = res?.ok ? await res.json() as { data?: { Media: Media | null } } : null;
        const m = body?.data?.Media;
        if (!m) return ctx.editReply(res && res.status !== 404 && !res.ok ? "AniList didn't respond, try again later." : `Nothing found for "${title}".`);

        // AniList descriptions contain <br> and <i> tags.
        const synopsis = (m.description ?? "No synopsis.").replace(/<br\s*\/?>/g, "\n").replace(/<\/?[^>]+>/g, "").replace(/\n{3,}/g, "\n\n");

        const embed = new VortexEmbed()
            .setTitle(m.title.english ?? m.title.romaji)
            .setURL(m.siteUrl)
            .setThumbnail(m.coverImage.large)
            .setDescription(truncate(synopsis, 700))
            .addField("Score", m.averageScore ? `⭐ ${m.averageScore}/100` : "—", true)
            .addField(type === "ANIME" ? "Episodes" : "Chapters", String((type === "ANIME" ? m.episodes : m.chapters) ?? "?"), true)
            .addField("Status", m.status.replace(/_/g, " ").toLowerCase(), true)
            .setFooter({ text: [m.format, m.seasonYear, m.genres.slice(0, 4).join(", ")].filter(Boolean).join(" · ") });

        if (m.coverImage.color) embed.setColor(parseInt(m.coverImage.color.slice(1), 16));
        if (m.title.english && m.title.english !== m.title.romaji) embed.setAuthor({ name: m.title.romaji });

        return ctx.editReply({ embeds: [embed] });
    }
}
