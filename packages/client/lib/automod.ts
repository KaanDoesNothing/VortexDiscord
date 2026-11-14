import { container } from "@sapphire/framework";
import { PermissionFlagsBits, type Message } from "discord.js";
import { DBManager } from "./database";
import { logModAction } from "./modlog";
import type { GuildSettings } from "./settings";

// Auto-moderation: blocked words, invite links, other links, mass mentions and message floods.
// Rules come from the dashboard (settings.automod). Runs on new and edited messages.

const INVITE = /(?:discord(?:app)?\.com\/invite|discord\.gg|dsc\.gg)\/[\w-]+/i;
const LINK = /https?:\/\/([^\s/$.?#][^\s/]*)/gi;

// guild:user → timestamps of recent messages, for flood detection.
const recent = new Map<string, number[]>();
// guild:user → last time we punished them, so one flood doesn't trigger ten timeouts.
const lastAction = new Map<string, number>();

type Automod = GuildSettings["automod"];

// Returns why the message breaks a rule, or null if it's fine.
export function findViolation(content: string, mentionCount: number, rules: Automod, floodCount: number): string | null {
    const lower = content.toLowerCase();

    for (const word of rules.blockedWords) {
        // Single words match whole words only ("ass" shouldn't hit "class"); phrases match anywhere.
        const hit = word.includes(" ")
            ? lower.includes(word)
            : new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(word)}($|[^\\p{L}\\p{N}])`, "iu").test(lower);
        if (hit) return "Blocked word";
    }

    if (rules.blockInvites && INVITE.test(content)) return "Invite link";

    if (rules.blockLinks) {
        for (const [, host] of content.matchAll(LINK)) {
            const domain = host!.toLowerCase().replace(/^www\./, "");
            const allowed = rules.allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
            if (!allowed) return "Link";
        }
    }

    if (rules.maxMentions > 0 && mentionCount > rules.maxMentions) return `Mass mention (${mentionCount})`;

    if (rules.spam.enabled && floodCount > rules.spam.messages) return "Sending messages too fast";

    return null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

    // Flood tracking (only for new messages, not edits).
    const key = `${message.guildId}:${message.author.id}`;
    let floodCount = 0;
    if (rules.spam.enabled && !message.editedTimestamp) {
        const now = Date.now();
        const windowStart = now - rules.spam.seconds * 1000;
        const times = (recent.get(key) ?? []).filter((t) => t > windowStart);
        times.push(now);
        recent.set(key, times);
        floodCount = times.length;
        if (recent.size > 20_000) recent.clear();
    }

    const mentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    const violation = findViolation(message.content, mentions, rules, floodCount);
    if (!violation) return false;

    await message.delete().catch(() => null);

    // Short notice in the channel, removed again after a few seconds.
    const notice = await message.channel.send({ content: `${message.author}, your message was removed: ${violation.toLowerCase()}.`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => null), 6000);

    // Punish at most once every 30 seconds per user.
    const now = Date.now();
    if (now - (lastAction.get(key) ?? 0) < 30_000) return true;
    lastAction.set(key, now);

    const me = message.client.user;
    const reason = `Auto-mod: ${violation}`;

    try {
        await logModAction(message.guild, { type: "automod", moderator: me, target: message.author, reason });

        if (rules.action === "warn") {
            await logModAction(message.guild, { type: "warn", moderator: me, target: message.author, reason });
        } else if (rules.action === "timeout" && member.moderatable) {
            const durationMs = rules.timeoutMinutes * 60_000;
            await member.timeout(durationMs, reason);
            await logModAction(message.guild, { type: "timeout", moderator: me, target: message.author, reason, durationMs });
        }
    } catch (error) {
        container.logger.warn(`Auto-mod action failed in ${message.guildId}:`, error);
    }

    return true;
}
