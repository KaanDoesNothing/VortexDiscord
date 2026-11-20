import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { listFeeds, twitchConfigured } from "../../../../lib/feeds";

// GET /guilds/:guild/feeds: followed feeds, plus whether Twitch is available on this bot.
export class FeedListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        return res.json({ twitch: twitchConfigured(), feeds: await listFeeds(access.guild.id) });
    }
}
