import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "./database/client";
import { stickyMessages, type StickyMessage } from "./database/schema";
import { VortexEmbed } from "./structures/embed";

// Sticky messages: the bot keeps one message at the bottom of a channel by re-posting it shortly
// after people talk (debounced, so a busy channel doesn't get a re-post per message).

const DEBOUNCE_MS = 5_000;
const stickies = new Map<string, StickyMessage>(); // channelId → sticky
const timers = new Map<string, Timer>();
let loaded = false;

async function ensureLoaded() {
    if (loaded) return;
    for (const row of await db.select().from(stickyMessages)) stickies.set(row.channelId, row);
    loaded = true;
}

export async function setSticky(input: { guildId: string; channelId: string; content: string; embed: boolean; createdBy: string }) {
    await ensureLoaded();
    const old = stickies.get(input.channelId);
    const [row] = await db.insert(stickyMessages).values({ ...input, lastMessageId: null })
        .onConflictDoUpdate({ target: stickyMessages.channelId, set: { content: input.content, embed: input.embed, createdBy: input.createdBy } })
        .returning();
    // Keep the old copy's ID so the next re-post deletes it.
    const entry = { ...row!, lastMessageId: old?.lastMessageId ?? null };
    stickies.set(input.channelId, entry);
    return entry;
}

export async function removeSticky(channelId: string) {
    await ensureLoaded();
    const sticky = stickies.get(channelId);
    stickies.delete(channelId);
    await db.delete(stickyMessages).where(eq(stickyMessages.channelId, channelId));
    return sticky ?? null;
}

export async function listStickies(guildId: string) {
    await ensureLoaded();
    return [...stickies.values()].filter((s) => s.guildId === guildId);
}

const render = (sticky: StickyMessage) => sticky.embed
    ? { embeds: [new VortexEmbed(sticky.guildId).setDescription(sticky.content).setFooter({ text: "📌 Sticky message" })] }
    : { content: `📌 ${sticky.content}` };

// Re-posts the sticky now: deletes the old copy and sends a new one at the bottom.
export async function repostSticky(channel: Message["channel"], sticky: StickyMessage) {
    if (!channel.isSendable()) return;
    if (sticky.lastMessageId) await channel.messages.delete(sticky.lastMessageId).catch(() => null);
    const sent = await channel.send({ ...render(sticky), allowedMentions: { parse: [] } }).catch(() => null);
    if (!sent) return;
    sticky.lastMessageId = sent.id;
    await db.update(stickyMessages).set({ lastMessageId: sent.id }).where(eq(stickyMessages.channelId, sticky.channelId)).catch(() => null);
}

// Called for every message: schedules a re-post in channels with a sticky.
export async function onMessageForSticky(message: Message) {
    await ensureLoaded();
    const sticky = stickies.get(message.channelId);
    // Our own messages (including the re-post itself) never trigger a re-post.
    if (!sticky || message.author.id === message.client.user.id) return;

    clearTimeout(timers.get(message.channelId));
    timers.set(message.channelId, setTimeout(() => {
        timers.delete(message.channelId);
        const current = stickies.get(message.channelId);
        if (current) void repostSticky(message.channel, current);
    }, DEBOUNCE_MS));
}
