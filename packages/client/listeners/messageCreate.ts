import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { Cooldowns } from "../lib/cooldowns";
import { DBManager } from "../lib/database";
import { addXp, multiplierFor, randomXp } from "../lib/leveling";
import { isBlacklisted } from "../lib/owner";

// Per "guild:user", so spamming doesn't level people up.
const cooldowns = new Cooldowns();

// Leveling: messages earn XP following the server's dashboard settings (on/off, XP range, cooldown,
// ignored channels and roles, multipliers). XP is saved in batches by lib/leveling.ts, which also
// handles level-up announcements and role rewards.
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.MessageCreate });
    }

    public async run(message: Message) {
        if (!message.inGuild() || message.author.bot || message.webhookId || !message.member) return;
        if (isBlacklisted(message.author.id, message.guildId)) return;

        const { settings } = await DBManager.getGuildConfig(message.guildId);
        const rules = settings.leveling;
        if (!rules.enabled) return;

        // Threads count as their parent channel for ignore lists and multipliers.
        const parentId = message.channel.isThread() ? message.channel.parentId : message.channel.parentId ?? null;
        if (rules.ignoredChannelIds.includes(message.channelId) || (parentId && rules.ignoredChannelIds.includes(parentId))) return;

        const key = `${message.guildId}:${message.author.id}`;
        if (rules.cooldownSeconds > 0 && !cooldowns.take(key, rules.cooldownSeconds * 1000)) return;

        const multiplier = multiplierFor(message.member, message.channelId, parentId, rules);
        if (multiplier <= 0) return;

        addXp(message.guildId, message.author.id, (randomXp(rules) * multiplier) / 100, { messages: 1, channelId: message.channelId });
    }
}
