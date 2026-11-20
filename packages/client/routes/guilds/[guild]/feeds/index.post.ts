import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { createFeed, FEED_TYPES, listFeeds, MAX_FEEDS_PER_GUILD, resolveSource, type FeedType } from "../../../../lib/feeds";

// POST /guilds/:guild/feeds with { type, source, channelId, message?, pingRoleId? }
export class FeedCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = (await req.readBodyJson().catch(() => null) ?? {}) as Record<string, unknown>;

        const type = String(body.type ?? "") as FeedType;
        if (!FEED_TYPES.includes(type)) return res.status(HttpCodes.BadRequest).json({ error: "Pick a feed type" });
        const channelId = String(body.channelId ?? "");
        if (!access.guild.channels.cache.get(channelId)?.isSendable()) return res.status(HttpCodes.BadRequest).json({ error: "Pick a channel the bot can post in" });
        const pingRoleId = body.pingRoleId ? String(body.pingRoleId) : null;
        if (pingRoleId && !access.guild.roles.cache.has(pingRoleId)) return res.status(HttpCodes.BadRequest).json({ error: "That role doesn't exist" });
        const message = typeof body.message === "string" ? body.message.slice(0, 1000) : "";
        if ((await listFeeds(access.guild.id)).length >= MAX_FEEDS_PER_GUILD) return res.status(HttpCodes.BadRequest).json({ error: `A server can follow at most ${MAX_FEEDS_PER_GUILD} feeds` });

        try {
            const { source, label } = await resolveSource(type, String(body.source ?? ""));
            const feed = await createFeed({ guildId: access.guild.id, type, source, label, channelId, message, pingRoleId });
            await Dashboard.addAudit(access.guild.id, access.auth.id, "feed.create", { type, label });
            return res.status(HttpCodes.Created).json(feed);
        } catch (error) {
            return res.status(HttpCodes.BadRequest).json({ error: (error as Error).message });
        }
    }
}
