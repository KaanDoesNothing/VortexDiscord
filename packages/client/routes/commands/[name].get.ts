import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { serializeCommandDetails } from "../../lib/api/serializers";

/** GET /commands/:name: one command, including its options. */
export class CommandDetailsRoute extends ApiRoute {
    public run(req: Route.Request, res: Route.Response) {
        const command = this.container.stores.get("commands").get(req.params.name!.toLowerCase());

        if (!command) return res.status(HttpCodes.NotFound).json({ error: "Command not found" });

        return res.json(serializeCommandDetails(command));
    }
}
