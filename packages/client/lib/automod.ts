import { container } from "@sapphire/framework";
import { PermissionFlagsBits, type Message } from "discord.js";
import { SlidingWindow, Cooldowns } from "./cooldowns";
import { DBManager } from "./database";
import { logModAction, notifyTarget } from "./modlog";
import type { GuildSettings } from "./settings";

// Auto-moderation: blocked words, invites, links, phishing, mass mentions, floods, duplicates,
// caps, emoji spam, repeated characters, line-break spam and zalgo text. Rules and what each one
// does come from the dashboard (settings.automod). Runs on new and edited messages.

type Automod = GuildSettings["automod"];
export type RuleKey = keyof Automod["actions"];

const INVITE = /(?:discord(?:app)?\.com\/invite|discord\.gg|dsc\.gg)\/[\w-]+/i;
const LINK = /https?:\/\/([^\s/$.?#][^\s/]*)/gi;
// Unicode emoji and custom <:name:id> emoji.
const EMOJI = /<a?:\w+:\d+>|\p{Extended_Pictographic}/gu;
// 3+ combining marks stacked on one character.
const ZALGO = /\p{M}{3,}/u;

// ---------- Phishing domains ----------

// Community-maintained list of Discord phishing domains, refreshed every 6 hours. If it can't be
// loaded, the pattern check below still catches the common fake-Nitro/Steam lookalikes.
const PHISHING_LIST = "https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json";
let phishingDomains = new Set<string>();
const SUSPICIOUS = /(d[il1]sc[o0]rd|disc[o0]r[cd]|dlscord|discrod|steamcommun[il1]ty|steancommunity|nitro)[-.]?(gift|nitro|app|give|airdrop|promo|drop)?\.(?!com\b|gg\b|media\b|gift\b(?=\/))[a-z]{2,}/i;
const OFFICIAL = new Set(["discord.com", "discord.gg", "discordapp.com", "discord.media", "discordapp.net", "discord.gift", "steamcommunity.com", "steampowered.com"]);

export async function refreshPhishingList() {
    try {
        const res = await fetch(PHISHING_LIST, { signal: AbortSignal.timeout(15_000) });
        const body = await res.json() as { domains?: string[] };
        if (Array.isArray(body.domains) && body.domains.length) phishingDomains = new Set(body.domains.map((d) => d.toLowerCase()));
        container.logger.debug(`Auto-mod: loaded ${phishingDomains.size} phishing domains.`);
    } catch (error) {
        container.logger.warn("Auto-mod: couldn't load the phishing domain list (using built-in patterns only):", error);
    }
}

export function startPhishingRefresh() {
    void refreshPhishingList();
    setInterval(() => void refreshPhishingList(), 6 * 60 * 60 * 1000).unref();
}

const isPhishing = (domain: string) => !OFFICIAL.has(domain) && (phishingDomains.has(domain) || SUSPICIOUS.test(domain));

// ---------- Rules ----------

export interface Violation { rule: RuleKey; label: string }

interface Context { mentionCount: number; floodCount: number; duplicateCount: number }

// Returns the first rule the message breaks, or null if it's fine. Pure: no Discord calls.
export function findViolation(content: string, rules: Automod, ctx: Context): Violation | null {
    const lower = content.toLowerCase();

    for (const word of rules.blockedWords) {
        // Single words match whole words only ("ass" shouldn't hit "class"); phrases match anywhere.
        const hit = word.includes(" ")
            ? lower.includes(word)
            : new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(word)}($|[^\\p{L}\\p{N}])`, "iu").test(lower);
        if (hit) return { rule: "words", label: "Blocked word" };
    }

    const domains = [...content.matchAll(LINK)].map(([, host]) => host!.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, ""));
    if (rules.blockPhishing && domains.some(isPhishing)) return { rule: "phishing", label: "Phishing link" };
    if (rules.blockInvites && INVITE.test(content)) return { rule: "invites", label: "Invite link" };
    if (rules.blockLinks) {
        const allowed = (d: string) => rules.allowedDomains.some((a) => d === a || d.endsWith(`.${a}`));
        if (domains.some((d) => !allowed(d))) return { rule: "links", label: "Link" };
    }

    if (rules.maxMentions > 0 && ctx.mentionCount > rules.maxMentions) return { rule: "mentions", label: `Mass mention (${ctx.mentionCount})` };
    if (rules.spam.enabled && ctx.floodCount > rules.spam.messages) return { rule: "spam", label: "Sending messages too fast" };
    if (rules.duplicates.enabled && ctx.duplicateCount >= rules.duplicates.count) return { rule: "duplicates", label: "Repeated message" };

    if (rules.caps.enabled) {
        const letters = content.replace(/<a?:\w+:\d+>|<[@#&!]+\d+>|https?:\/\/\S+/g, "").match(/\p{L}/gu) ?? [];
        if (letters.length >= rules.caps.minLength) {
            const upper = letters.filter((l) => l !== l.toLowerCase()).length;
            if ((upper / letters.length) * 100 >= rules.caps.percent) return { rule: "caps", label: "Too many capital letters" };
        }
    }

    if (rules.emoji.enabled && (content.match(EMOJI)?.length ?? 0) > rules.emoji.max) return { rule: "emoji", label: "Too many emojis" };
    if (rules.repeatedChars.enabled && new RegExp(`(.)\\1{${rules.repeatedChars.max},}`, "su").test(content)) return { rule: "repeatedChars", label: "Repeated characters" };
    if (rules.newlines.enabled && (content.match(/\n/g)?.length ?? 0) > rules.newlines.max) return { rule: "newlines", label: "Too many line breaks" };
    if (rules.zalgo && ZALGO.test(content)) return { rule: "zalgo", label: "Zalgo text" };

    return null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Running it ----------

// Recent messages per guild:user, for flood detection (window up to 60s).
const floods = new SlidingWindow(60_000);
// Recent identical messages per guild:user:content-hash (window up to 10 minutes).
const duplicates = new SlidingWindow(600_000);
// Last punishment per guild:user, so one flood doesn't trigger ten timeouts.
const punished = new Cooldowns();

// Checks a message against the server's rules and acts on it. Returns true if the message was removed.
export async function runAutomod(message: Message): Promise<boolean> {
    if (!message.inGuild() || message.author.bot || message.webhookId) return false;

    const { settings } = await DBManager.getGuildConfig(message.guildId);
    const rules = settings.automod;
    if (!rules.enabled) return false;

    const member = message.member;
    // Staff and exempt roles/channels are never moderated.
    if (!member || member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (rules.exemptChannelIds.includes(message.channelId)) return false;
    if (rules.exemptRoleIds.some((id) => member.roles.cache.has(id))) return false;

    // Flood and duplicate tracking (only for new messages, not edits).
    const key = `${message.guildId}:${message.author.id}`;
    const isNew = !message.editedTimestamp;
    const floodCount = rules.spam.enabled && isNew ? floods.hit(key, rules.spam.seconds * 1000) : 0;
    const normalized = message.content.trim().toLowerCase();
    const duplicateCount = rules.duplicates.enabled && isNew && normalized.length >= 3
        ? duplicates.hit(`${key}:${Bun.hash(normalized)}`, rules.duplicates.seconds * 1000)
        : 0;

    const mentionCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    const violation = findViolation(message.content, rules, { mentionCount, floodCount, duplicateCount });
    if (!violation) return false;

    await message.delete().catch(() => null);

    // Short notice in the channel, removed again after a few seconds.
    const notice = await message.channel.send({ content: `${message.author}, your message was removed: ${violation.label.toLowerCase()}.`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => null), 6000);

    // Punish at most once every 30 seconds per user.
    if (!punished.take(key, 30_000)) return true;

    const action = rules.actions[violation.rule] === "default" ? rules.action : rules.actions[violation.rule];
    const me = message.client.user;
    const reason = `Auto-mod: ${violation.label}`;
    const target = message.author;

    try {
        await logModAction(message.guild, { type: "automod", moderator: me, target, reason });

        if (action === "warn") {
            await notifyTarget(message.guild, { type: "warn", moderator: me, target, reason });
            await logModAction(message.guild, { type: "warn", moderator: me, target, reason });
        } else if (action === "timeout" && member.moderatable) {
            const durationMs = rules.timeoutMinutes * 60_000;
            await notifyTarget(message.guild, { type: "timeout", moderator: me, target, reason, durationMs });
            await member.timeout(durationMs, reason);
            await logModAction(message.guild, { type: "timeout", moderator: me, target, reason, durationMs });
        } else if (action === "kick" && member.kickable) {
            await notifyTarget(message.guild, { type: "kick", moderator: me, target, reason });
            await member.kick(reason);
            await logModAction(message.guild, { type: "kick", moderator: me, target, reason });
        } else if (action === "ban" && member.bannable) {
            await notifyTarget(message.guild, { type: "ban", moderator: me, target, reason });
            await message.guild.bans.create(target.id, { reason, deleteMessageSeconds: 3600 });
            await logModAction(message.guild, { type: "ban", moderator: me, target, reason });
        }
    } catch (error) {
        container.logger.warn(`Auto-mod action failed in ${message.guildId}:`, error);
    }

    return true;
}
