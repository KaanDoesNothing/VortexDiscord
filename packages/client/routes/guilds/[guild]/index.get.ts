import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { requireGuildManager } from "../../../lib/api/auth";
import { DBManager, Dashboard } from "../../../lib/database";
import { twitchConfigured } from "../../../lib/feeds";
import { PLACEHOLDERS } from "../../../lib/settings";
import { STAT_PLACEHOLDERS } from "../../../lib/statsChannels";

// GET /guilds/:guild: everything the dashboard needs for one server:
// server info, its channels and roles (for pickers), current settings, and activity stats.
export class GuildOverviewRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const { guild } = access;
        const [config, stats] = await Promise.all([
            DBManager.getGuildConfig(guild.id),
            Dashboard.getGuildStats(guild.id)
        ]);

        const me = guild.members.me;
        const channels = guild.channels.cache;

        // Text-like channels the bot could post in, sorted the way Discord shows them.
        const textChannels = channels
            .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
            .sort((a, b) => a.position - b.position)
            .map((c) => ({
                id: c.id,
                name: c.name,
                canSend: me ? Boolean(c.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) : false
            }));

        // All roles except @everyone, highest first. "assignable" = the bot can give it (for auto-roles).
        const roles = guild.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, assignable: r.editable && !r.managed }));

        // Voice channels (temp voice hubs, stats channels).
        const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
            .sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, name: c.name, canSend: true }));

        // Channel categories (for picking where tickets are created).
        const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, name: c.name }));

        return res.json({
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ size: 256, extension: "webp" }),
                memberCount: guild.memberCount,
                textChannels: textChannels.length,
                voiceChannels: channels.filter((c) => c.type === ChannelType.GuildVoice).size,
                roles: roles.length,
                createdAt: guild.createdAt.toISOString()
            },
            channels: textChannels,
            roles,
            categories,
            voiceChannels,
            config,
            placeholders: PLACEHOLDERS,
            features: {
                membersIntent: Bun.env.DISCORD_MEMBERS_INTENT === "true",
                twitch: twitchConfigured(),
                // Features that need the bot to have Manage Server (invite tracking, lockdowns).
                manageGuild: Boolean(me?.permissions.has(PermissionFlagsBits.ManageGuild))
            },
            statPlaceholders: STAT_PLACEHOLDERS,
            stats
        });
    }
}
