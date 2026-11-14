import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { serializeCommand } from "../../lib/api/serializers";

/** GET /commands, with an optional ?category=moderation filter. */
export class CommandListRoute extends ApiRoute {
    public run(req: Route.Request, res: Route.Response) {
        const category = typeof req.query.category === "string" ? req.query.category.toLowerCase() : null;

        const commands = this.container.stores.get("commands")
            .filter((command) => !category || command.category?.toLowerCase() === category)
            .map(serializeCommand)
            .sort((a, b) => a.name.localeCompare(b.name));

        return res.json(commands);
    }
}
