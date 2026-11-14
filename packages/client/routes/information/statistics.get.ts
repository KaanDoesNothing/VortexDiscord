import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";

export class StatisticsRoute extends ApiRoute {
    public run(_req: Route.Request, res: Route.Response) {
        const { client, stores } = this.container;
        const guilds = client.guilds.cache;

        return res.json({
            guilds: guilds.size,
            users: guilds.reduce((total, guild) => total + guild.memberCount, 0),
            channels: client.channels.cache.size,
            commands: stores.get("commands").size
        });
    }
}
