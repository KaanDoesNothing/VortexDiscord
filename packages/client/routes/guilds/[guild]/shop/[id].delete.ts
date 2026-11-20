import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard, Economy } from "../../../../lib/database";

// DELETE /guilds/:guild/shop/:id (also removes it from everyone's inventory).
export class ShopDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        if (!await Economy.deleteShopItem(access.guild.id, Number(req.params.id))) return res.status(HttpCodes.NotFound).json({ error: "Item not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "shop.delete", { id: Number(req.params.id) });
        return res.json({ ok: true });
    }
}
