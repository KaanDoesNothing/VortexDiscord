import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { getBotStats } from "../../lib/api/stats";

// GET /information/stats: public bot statistics for the Stats page (shards, usage, system).
export class BotStatsRoute extends ApiRoute {
    public async run(_req: Route.Request, res: Route.Response) {
        return res.json(await getBotStats());
    }
}
