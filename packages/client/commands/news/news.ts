import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { apiErrorMessage, getJson, truncate } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Item { id: number; title: string; url?: string; score: number; by: string; time: number; descendants?: number }
interface Search { hits: { objectID: string; title: string; url: string | null; points: number; author: string; created_at_i: number; num_comments: number }[] }

// /news [feed] [topic]: tech headlines from Hacker News, or a search across recent stories.
export class NewsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["headlines", "hn"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("news")
        .setDescription("Tech news headlines from Hacker News, or search for a topic")
        .addStringOption((o) => o.setName("feed").setDescription("Which list").addChoices(
            { name: "Top stories", value: "top" },
            { name: "Newest", value: "new" },
            { name: "Best", value: "best" },
            { name: "Ask HN", value: "ask" },
            { name: "Show HN", value: "show" }
        ))
        .addStringOption((o) => o.setName("topic").setDescription("Search recent stories about a topic instead, e.g. AI").setMaxLength(100));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const feed = ctx.options.getString("feed") ?? "top";
        const topic = ctx.options.getString("topic");
        await ctx.deferReply();

        try {
            let stories: { title: string; url: string; score: number; by: string; time: number; comments: number; id: string }[];

            if (topic) {
                // Stories from the last 7 days matching the topic, by relevance.
                const since = Math.floor(Date.now() / 1000) - 7 * 86_400;
                const r = await getJson<Search>(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=8`, { cacheMs: 600_000 });
                stories = r.hits.map((h) => ({ id: h.objectID, title: h.title, url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`, score: h.points, by: h.author, time: h.created_at_i, comments: h.num_comments }));
            } else {
                const ids = await getJson<number[]>(`https://hacker-news.firebaseio.com/v0/${feed}stories.json`, { cacheMs: 300_000 });
                const items = await Promise.all(ids.slice(0, 8).map((id) => getJson<Item>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { cacheMs: 300_000 }).catch(() => null)));
                stories = items.filter((i): i is Item => Boolean(i?.title)).map((i) => ({
                    id: String(i.id), title: i.title, url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`, score: i.score, by: i.by, time: i.time, comments: i.descendants ?? 0
                }));
            }

            if (!stories.length) return ctx.editReply(topic ? `No recent stories about "${topic}".` : "No stories right now.");

            const lines = stories.map((s, i) =>
                `**${i + 1}. [${truncate(s.title, 120)}](${s.url})**\n▲ ${s.score} · 💬 [${s.comments}](https://news.ycombinator.com/item?id=${s.id}) · ${time(new Date(s.time * 1000), "R")}`);

            const title = topic ? `📰 News about "${topic}"` : `📰 Hacker News · ${{ top: "Top stories", new: "Newest", best: "Best", ask: "Ask HN", show: "Show HN" }[feed]}`;
            const embed = new VortexEmbed().setTitle(title).setDescription(lines.join("\n\n")).setFooter({ text: "Source: Hacker News" });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
