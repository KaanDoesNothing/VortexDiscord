import { Events, Listener } from "@sapphire/framework";
import type { GuildMember, Message } from "discord.js";
import { DBManager } from "../lib/database";
import { isBlacklisted } from "../lib/owner";
import { renderTemplate } from "../lib/settings";

// Last counted message per "guild:user", for the leveling cooldown.
const lastCounted = new Map<string, number>();

// Leveling: every message in a server counts toward the member's level, following the
// server's dashboard settings (on/off, messages per level, cooldown, ignored channels, announcements).
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        if (!message.inGuild() || message.author.bot || message.webhookId) return;
        if (isBlacklisted(message.author.id, message.guildId)) return;

        const { settings } = await DBManager.getGuildConfig(message.guildId);
        const leveling = settings.leveling;

        if (!leveling.enabled || leveling.ignoredChannelIds.includes(message.channelId)) return;

        // Cooldown, so spamming doesn't level people up.
        if (leveling.cooldownSeconds > 0) {
            const key = `${message.guildId}:${message.author.id}`;
            const now = Date.now();
            if (now - (lastCounted.get(key) ?? 0) < leveling.cooldownSeconds * 1000) return;
            lastCounted.set(key, now);

            // Keep the map from growing forever.
            if (lastCounted.size > 50_000) lastCounted.clear();
        }

        const newLevel = await DBManager.addMessage(message.guildId, message.author.id, leveling.messagesPerLevel);
        if (newLevel === null) return;

        // Role rewards for reaching this level (dashboard: Leveling → Role rewards).
        if (message.member) await applyLevelRewards(message.member, newLevel, leveling.rewards, leveling.stackRewards).catch(() => null);

        if (!leveling.announce) return;

        const channel = leveling.announceChannelId
            ? await message.guild.channels.fetch(leveling.announceChannelId).catch(() => null)
            : message.channel;
        if (!channel?.isSendable()) return;

        const content = renderTemplate(leveling.message, {
            user: { id: message.author.id, username: message.author.username, displayName: message.member?.displayName },
            server: { name: message.guild.name, memberCount: message.guild.memberCount },
            channelId: message.channelId,
            level: newLevel
        });

        await channel.send({ content, allowedMentions: { users: [message.author.id] } }).catch(() => null);
    }
}

// Gives the member every reward role for levels they've reached. With stacking off, only the highest
// earned reward role is kept and lower ones are removed. Skips roles the bot isn't allowed to manage.
async function applyLevelRewards(member: GuildMember, level: number, rewards: { level: number; roleId: string }[], stack: boolean) {
    if (!rewards.length) return;

    const manageable = (id: string) => {
        const role = member.guild.roles.cache.get(id);
        return role && role.editable && !role.managed;
    };

    const earned = rewards.filter((r) => r.level <= level && manageable(r.roleId)).sort((a, b) => a.level - b.level);
    if (!earned.length) return;

    const keep = stack ? earned.map((r) => r.roleId) : [earned.at(-1)!.roleId];
    const remove = stack ? [] : earned.slice(0, -1).map((r) => r.roleId).filter((id) => member.roles.cache.has(id));
    const add = keep.filter((id) => !member.roles.cache.has(id));

    if (add.length) await member.roles.add(add, `Level ${level} reward`);
    if (remove.length) await member.roles.remove(remove, "Replaced by a higher level reward");
}
