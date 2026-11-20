import { container } from "@sapphire/framework";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "./database/client";
import { feeds, type Feed } from "./database/schema";
import { VortexEmbed } from "./structures/embed";

// Social feeds (Dashboard → Utility → Social feeds, or /feed): posts new YouTube videos, Twitch
// streams going live, Reddit posts and items from any RSS/Atom feed into a channel.
//
// Every minute the oldest-checked feeds are refreshed. A source followed by several servers is only
// downloaded once per round. Feeds that keep failing are checked less and less often.

export const FEED_TYPES = ["youtube", "twitch", "reddit", "rss"] as const;
export type FeedType = (typeof FEED_TYPES)[number];
export const MAX_FEEDS_PER_GUILD = 15;

const CHECK_EVERY_MS = 5 * 60_000;
const BATCH = 40;
const USER_AGENT = "VortexBot/1.0 (Discord bot feed reader)";

export const twitchConfigured = () => Boolean(Bun.env.TWITCH_CLIENT_ID && Bun.env.TWITCH_CLIENT_SECRET);

export interface FeedItem { id: string; title: string; url: string; author: string; published: Date | null; image?: string | null }

export const DEFAULT_MESSAGES: Record<FeedType, string> = {
    youtube: "📺 **{author}** uploaded a new video!\n{url}",
    twitch: "🔴 **{author}** is live: **{title}**\n{url}",
    reddit: "📰 New post in **{author}**: **{title}**\n{url}",
    rss: "📰 **{title}**\n{url}"
};

// ---------- Fetching ----------

const decode = (s: string) => s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1];
const attr = (xml: string, name: string, attribute: string) => xml.match(new RegExp(`<${name}\\s[^>]*${attribute}="([^"]+)"`))?.[1];

// RSS 2.0 <item>s or Atom <entry>s, newest first (as feeds publish them).
export function parseFeed(xml: string): FeedItem[] {
    const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/g)].map((m) => m[0]);
    return blocks.map((b) => {
        const link = attr(b, "link", "href") ?? decode(tag(b, "link") ?? "");
        const id = decode(tag(b, "yt:videoId") ?? tag(b, "guid") ?? tag(b, "id") ?? link);
        const date = tag(b, "published") ?? tag(b, "pubDate") ?? tag(b, "updated");
        return {
            id,
            title: decode(tag(b, "title") ?? "Untitled").slice(0, 250),
            url: link,
            author: decode(tag(tag(b, "author") ?? "", "name") ?? tag(b, "dc:creator") ?? "").slice(0, 100),
            published: date ? new Date(decode(date)) : null,
            image: attr(b, "media:thumbnail", "url") ?? null
        };
    }).filter((i) => i.id && i.url);
}

async function getText(url: string) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.text();
}

let twitchToken: { value: string; expires: number } | null = null;

async function twitchAuth() {
    if (twitchToken && twitchToken.expires > Date.now() + 60_000) return twitchToken.value;
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({ client_id: Bun.env.TWITCH_CLIENT_ID!, client_secret: Bun.env.TWITCH_CLIENT_SECRET!, grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(15_000)
    });
    const body = await res.json() as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error("Twitch login failed (check TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)");
    twitchToken = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return twitchToken.value;
}

async function twitchStream(login: string): Promise<FeedItem[]> {
    const token = await twitchAuth();
    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`, {
        headers: { "Client-Id": Bun.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000)
    });
    const body = await res.json() as { data?: { id: string; user_name: string; title: string; started_at: string; thumbnail_url: string; game_name: string }[] };
    // Live = one item (the stream). Each new stream has a new ID, so going live again posts again.
    return (body.data ?? []).map((s) => ({
        id: s.id,
        title: s.title || s.game_name || "Live now",
        url: `https://twitch.tv/${login}`,
        author: s.user_name,
        published: new Date(s.started_at),
        image: s.thumbnail_url.replace("{width}", "1280").replace("{height}", "720")
    }));
}

export async function fetchItems(type: FeedType, source: string): Promise<FeedItem[]> {
    switch (type) {
        case "youtube": return parseFeed(await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(source)}`));
        case "reddit": return parseFeed(await getText(`https://www.reddit.com/r/${encodeURIComponent(source)}/new/.rss`)).map((i) => ({ ...i, author: `r/${source}` }));
        case "twitch": return twitchStream(source);
        default: return parseFeed(await getText(source));
    }
}

// ---------- Adding a feed ----------

// Turns what someone typed into the stored source, plus a friendly label. Throws with a readable message.
export async function resolveSource(type: FeedType, input: string): Promise<{ source: string; label: string }> {
    const value = input.trim();
    if (type === "youtube") {
        let channelId = value.match(/(UC[\w-]{22})/)?.[1];
        if (!channelId) {
            // @handle or a channel URL: the page contains the channel ID.
            const handle = value.match(/@[\w.-]+/)?.[0] ?? (value.startsWith("http") ? null : `@${value}`);
            const page = await getText(handle ? `https://www.youtube.com/${handle}` : value).catch(() => "");
            channelId = page.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1];
        }
        if (!channelId) throw new Error("Couldn't find that YouTube channel. Use its link, @handle or channel ID (starts with UC).");
        // Also checks the channel's feed works.
        const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        return { source: channelId, label: decode(tag(xml, "title") ?? channelId).slice(0, 100) };
    }
    if (type === "reddit") {
        const sub = value.replace(/^.*reddit\.com\/r\//i, "").replace(/^\/?r\//i, "").split(/[/?#]/)[0]!;
        if (!/^\w{2,21}$/.test(sub)) throw new Error("That isn't a subreddit name (e.g. `aww` or `r/aww`).");
        await fetchItems("reddit", sub);
        return { source: sub, label: `r/${sub}` };
    }
    if (type === "twitch") {
        if (!twitchConfigured()) throw new Error("Twitch feeds need TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in the bot's .env.");
        const login = value.replace(/^.*twitch\.tv\//i, "").split(/[/?#]/)[0]!.toLowerCase();
        if (!/^\w{3,25}$/.test(login)) throw new Error("That isn't a Twitch username.");
        await twitchStream(login);
        return { source: login, label: login };
    }
    if (!/^https:\/\/\S+$/.test(value)) throw new Error("RSS feeds need a full https:// link.");
    const xml = await getText(value);
    if (!parseFeed(xml).length && !/<(rss|feed)[\s>]/.test(xml)) throw new Error("That link doesn't look like an RSS or Atom feed.");
    return { source: value, label: decode(tag(xml, "title") ?? value).slice(0, 100) };
}

// ---------- Posting ----------

function renderPost(feed: Feed, item: FeedItem) {
    const template = feed.message || DEFAULT_MESSAGES[feed.type as FeedType] || DEFAULT_MESSAGES.rss;
    const values: Record<string, string> = { "{title}": item.title, "{url}": item.url, "{author}": item.author || feed.label, "{label}": feed.label };
    const text = template.replace(/\{\w+\}/g, (m) => values[m] ?? m);
    const ping = feed.pingRoleId ? `<@&${feed.pingRoleId}> ` : "";

    // YouTube and Twitch links unfurl by themselves; other items get a small embed.
    const embeds = feed.type === "youtube" || feed.type === "twitch" ? [] : [
        new VortexEmbed(feed.guildId).setTitle(item.title.slice(0, 256)).setURL(item.url).setAuthor({ name: (item.author || feed.label).slice(0, 256) })
            .setImage(item.image ?? null).setTimestamp(item.published ?? new Date())
    ];
    return { content: `${ping}${text}`.slice(0, 2000), embeds, allowedMentions: { roles: feed.pingRoleId ? [feed.pingRoleId] : [] } };
}

// Which items are new since the last check (oldest first, at most 3 so a backlog doesn't flood the channel).
export function newItems(items: FeedItem[], lastItemId: string | null, lastChecked: Date | null) {
    if (!items.length) return [];
    const index = lastItemId ? items.findIndex((i) => i.id === lastItemId) : -1;
    const fresh = index >= 0 ? items.slice(0, index)
        // The last seen item is gone (deleted or pushed out): fall back to publish dates.
        : lastChecked ? items.filter((i) => i.published && i.published > lastChecked) : [];
    return fresh.slice(0, 3).reverse();
}

async function checkFeed(feed: Feed, round: Map<string, Promise<FeedItem[]>>) {
    const key = `${feed.type}:${feed.source}`;
    if (!round.has(key)) round.set(key, fetchItems(feed.type as FeedType, feed.source));

    try {
        const items = await round.get(key)!;
        const posts = newItems(items, feed.lastItemId, feed.lastCheckedAt);
        const channel = container.client.channels.cache.get(feed.channelId);
        if (posts.length && channel?.isSendable()) {
            for (const item of posts) await channel.send(renderPost(feed, item)).catch(() => null);
        }
        // Twitch: offline means no items; keep the last stream ID so a reconnect isn't re-posted.
        await db.update(feeds).set({ lastItemId: items[0]?.id ?? feed.lastItemId, lastCheckedAt: new Date(), failures: 0 }).where(eq(feeds.id, feed.id));
    } catch (error) {
        container.logger.debug(`Feed #${feed.id} (${key}) failed:`, error);
        await db.update(feeds).set({ lastCheckedAt: new Date(), failures: sql`${feeds.failures} + 1` }).where(eq(feeds.id, feed.id));
    }
}

async function tick() {
    // Due: never checked, or older than 5 minutes × (1 + failures) (capped at 12 → once an hour).
    const due = await db.select().from(feeds)
        .where(or(isNull(feeds.lastCheckedAt), lt(feeds.lastCheckedAt, sql`now() - (${CHECK_EVERY_MS} * (1 + LEAST(${feeds.failures}, 11))) * interval '1 millisecond'`)))
        .orderBy(asc(feeds.lastCheckedAt))
        .limit(BATCH);

    const round = new Map<string, Promise<FeedItem[]>>();
    for (const feed of due) {
        // Twitch feeds are skipped (not failed) when the bot has no Twitch keys.
        if (feed.type === "twitch" && !twitchConfigured()) continue;
        if (!container.client.guilds.cache.has(feed.guildId)) continue;
        await checkFeed(feed, round);
    }
}

export function startFeeds() {
    setInterval(() => void tick().catch((error) => container.logger.warn("Feeds round failed:", error)), 60_000).unref();
}

// ---------- Storage ----------

export async function listFeeds(guildId: string) {
    return db.select().from(feeds).where(eq(feeds.guildId, guildId)).orderBy(feeds.id);
}

export async function createFeed(input: { guildId: string; type: FeedType; source: string; label: string; channelId: string; message: string; pingRoleId: string | null }) {
    // Start from the newest item, so old posts aren't dumped into the channel.
    const items = await fetchItems(input.type, input.source).catch(() => []);
    const [row] = await db.insert(feeds).values({ ...input, lastItemId: items[0]?.id ?? null, lastCheckedAt: new Date() }).returning();
    return row!;
}

export async function updateFeed(guildId: string, id: number, input: Partial<Pick<Feed, "channelId" | "message" | "pingRoleId">>) {
    const [row] = await db.update(feeds).set(input).where(and(eq(feeds.guildId, guildId), eq(feeds.id, id))).returning();
    return row ?? null;
}

export async function deleteFeed(guildId: string, id: number) {
    const rows = await db.delete(feeds).where(and(eq(feeds.guildId, guildId), eq(feeds.id, id))).returning({ id: feeds.id });
    return rows.length > 0;
}
