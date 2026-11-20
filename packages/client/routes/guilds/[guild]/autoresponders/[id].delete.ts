import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { deleteAutoresponder } from "../../../../lib/autoresponders";
import { Dashboard } from "../../../../lib/database";

// DELETE /guilds/:guild/autoresponders/:id
export class AutoresponderDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        if (!await deleteAutoresponder(access.guild.id, Number(req.params.id))) return res.status(HttpCodes.NotFound).json({ error: "Autoresponder not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "autoresponder.delete", { id: Number(req.params.id) });
        return res.json({ ok: true });
    }
}
