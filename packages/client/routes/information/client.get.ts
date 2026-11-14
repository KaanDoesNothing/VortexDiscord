import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { serializeClient } from "../../lib/api/serializers";

/** GET /information/client: the bot's name and avatar. */
export class ClientInformationRoute extends ApiRoute {
    public run(_req: Route.Request, res: Route.Response) {
        const { client } = this.container;

        if (!client.isReady()) return res.status(HttpCodes.ServiceUnavailable).json({ error: "Client is not ready yet" });

        return res.json(serializeClient(client));
    }
}
