import { Events, Listener } from "@sapphire/framework";
import { AuditLogEvent, ChannelType, PermissionFlagsBits, type Guild, type User } from "discord.js";
import { snapshotInvites } from "../lib/invites";
import { linkButtons } from "../lib/links";
import { applyPresence, isBlacklisted } from "../lib/owner";
import { VortexEmbed } from "../lib/structures/embed";

// Joined a new server: leave immediately if it (or its owner) is blacklisted. Otherwise welcome
// whoever added the bot with a quick-start guide (DM, falling back to a channel), start invite
// tracking, and refresh the status count. First impressions decide whether a bot stays.
export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.GuildCreate });
    }

    public async run(guild: Guild) {
        if (isBlacklisted(guild.id, guild.ownerId)) {
            this.container.logger.info(`Left blacklisted server ${guild.name} (${guild.id}).`);
            await guild.leave().catch(() => null);
            return;
        }
        this.container.logger.info(`Joined ${guild.name} (${guild.id}, ${guild.memberCount} members).`);
        applyPresence();
        void snapshotInvites(guild);
        await this.welcome(guild).catch((error) => this.container.logger.debug(`Onboarding message failed in ${guild.id}:`, error));
    }

    private async welcome(guild: Guild) {
        const client = guild.client;
        const embed = new VortexEmbed()
            .setTitle(`👋 Thanks for adding ${client.user.username} to ${guild.name}!`)
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription("Here's how to get going in under a minute:")
            .addField("1. Pick a preset", "`/setup` sets everything up for a community, gaming, small or moderation-focused server.")
            .addField("2. Fine-tune it", "Every feature (welcome cards, leveling, auto-mod, economy, tickets, logs…) can be customized in the dashboard.")
            .addField("3. Explore", "`/help` lists every command. Slash commands and the `->` prefix both work (change it with `/prefix`).")
            .setFooter({ text: "Tip: move my role near the top so I can manage roles and moderate everyone below it." });
        const payload = { embeds: [embed], components: linkButtons(client, ["dashboard", "support"], guild.id) };

        // Whoever added the bot (needs View Audit Log, which the invite asks for).
        const inviter = await this.inviter(guild);
        if (inviter && await inviter.send(payload).then(() => true, () => false)) return;

        // Otherwise the system channel, or the first channel everyone can read and the bot can post in.
        const me = guild.members.me;
        const channel = [guild.systemChannel, ...guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).sort((a, b) => a.position - b.position).values()]
            .find((c) => c?.isSendable() && me && c.permissionsFor(me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]) && c.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel));
        if (channel?.isSendable()) await channel.send(payload);
    }

    private async inviter(guild: Guild): Promise<User | null> {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 }).catch(() => null);
        const entry = logs?.entries.find((e) => (e.target as { id?: string } | null)?.id === guild.client.user.id);
        const executor = entry?.executorId ? await guild.client.users.fetch(entry.executorId).catch(() => null) : null;
        return executor ?? (await guild.fetchOwner().catch(() => null))?.user ?? null;
    }
}
