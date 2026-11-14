import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../lib/api/ApiRoute";

/** GET /: health check. */
export class HealthRoute extends ApiRoute {
    public run(_req: Route.Request, res: Route.Response) {
        const { client } = this.container;

        return res.json({
            status: client.isReady() ? "online" : "starting",
            uptime: client.uptime ?? 0,
            ping: client.ws.ping
        });
    }
}
