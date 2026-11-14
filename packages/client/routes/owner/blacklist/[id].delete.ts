import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireOwner } from "../../../lib/api/auth";
import { blacklistRemove } from "../../../lib/owner";

// DELETE /owner/blacklist/:id
export class OwnerBlacklistRemoveRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        const removed = await blacklistRemove(req.params.id ?? "");
        if (!removed) return res.status(HttpCodes.NotFound).json({ error: "Not on the blacklist" });
        return res.status(HttpCodes.NoContent).end();
    }
}
