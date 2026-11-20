import type { Message } from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import { Cooldowns } from "./cooldowns";
import { TtlCache } from "./database/cache";
import { db } from "./database/client";
import { autoresponders, type Autoresponder } from "./database/schema";
import { memberContext, userContext } from "./messages";
import { renderTemplate } from "./settings";
import { VortexEmbed } from "./structures/embed";

// Autoresponders: when a message matches a trigger (no prefix needed), the bot replies and/or
// reacts. Managed in the dashboard (Utility → Autoresponders) or with /autoresponder.

export const MATCH_TYPES = ["contains", "exact", "startsWith", "word"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];
export const MAX_AUTORESPONDERS = 50;

const cache = new TtlCache<Autoresponder[]>(60_000);
const cooldowns = new Cooldowns();

export const listAutoresponders = (guildId: string) => cache.get(guildId, () => db.select().from(autoresponders).where(eq(autoresponders.guildId, guildId)).orderBy(autoresponders.id));

export type AutoresponderInput = Pick<Autoresponder, "trigger" | "match" | "response" | "embed" | "reaction" | "channelIds" | "cooldownSeconds" | "enabled">;

export async function createAutoresponder(guildId: string, input: AutoresponderInput, createdBy: string) {
    const [row] = await db.insert(autoresponders).values({ guildId, ...input, createdBy }).returning();
    cache.delete(guildId);
    return row!;
}

export async function updateAutoresponder(guildId: string, id: number, input: Partial<AutoresponderInput>) {
    const [row] = await db.update(autoresponders).set(input).where(and(eq(autoresponders.guildId, guildId), eq(autoresponders.id, id))).returning();
    cache.delete(guildId);
    return row ?? null;
}

export async function deleteAutoresponder(guildId: string, id: number) {
    const rows = await db.delete(autoresponders).where(and(eq(autoresponders.guildId, guildId), eq(autoresponders.id, id))).returning({ id: autoresponders.id });
    cache.delete(guildId);
    return rows.length > 0;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matches(content: string, trigger: string, match: string) {
    const text = content.toLowerCase().trim();
    const t = trigger.toLowerCase().trim();
    if (!t) return false;
    switch (match as MatchType) {
        case "exact": return text === t;
        case "startsWith": return text.startsWith(t);
        case "word": return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(t)}($|[^\\p{L}\\p{N}])`, "iu").test(text);
        default: return text.includes(t);
    }
}

// Called for every message in a server. Answers with the first matching autoresponder.
export async function runAutoresponders(message: Message<true>) {
    const list = await listAutoresponders(message.guildId);
    if (!list.length) return;

    const parentId = message.channel.isThread() ? message.channel.parentId : null;
    const hit = list.find((a) => a.enabled
        && (!a.channelIds.length || a.channelIds.includes(message.channelId) || (parentId !== null && a.channelIds.includes(parentId)))
        && matches(message.content, a.trigger, a.match));
    if (!hit) return;

    // Per channel, so one trigger word can't be used to spam.
    if (hit.cooldownSeconds > 0 && !cooldowns.take(`${hit.id}:${message.channelId}`, hit.cooldownSeconds * 1000)) return;

    if (hit.reaction) await message.react(hit.reaction).catch(() => null);
    if (hit.response) {
        const text = renderTemplate(hit.response, message.member ? memberContext(message.member, { channelId: message.channelId }) : { user: userContext(message.author), channelId: message.channelId });
        const payload = hit.embed ? { embeds: [new VortexEmbed(message.guildId).setDescription(text.slice(0, 4096))] } : { content: text.slice(0, 2000) };
        // Never ping @everyone/@here or roles from an autoresponder.
        await message.reply({ ...payload, allowedMentions: { parse: ["users"], repliedUser: false } }).catch(() => null);
    }
    await db.update(autoresponders).set({ uses: sql`${autoresponders.uses} + 1` }).where(eq(autoresponders.id, hit.id)).catch(() => null);
}
