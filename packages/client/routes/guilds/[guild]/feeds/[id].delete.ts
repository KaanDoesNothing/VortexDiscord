import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { deleteFeed } from "../../../../lib/feeds";

// DELETE /guilds/:guild/feeds/:id
export class FeedDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        if (!await deleteFeed(access.guild.id, Number(req.params.id))) return res.status(HttpCodes.NotFound).json({ error: "Feed not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "feed.delete", { id: Number(req.params.id) });
        return res.json({ ok: true });
    }
}
