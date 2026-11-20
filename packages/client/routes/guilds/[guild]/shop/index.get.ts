import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Economy } from "../../../../lib/database";

// GET /guilds/:guild/shop: every shop item (including disabled ones).
export class ShopListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        return res.json(await Economy.listShopItems(access.guild.id));
    }
}
