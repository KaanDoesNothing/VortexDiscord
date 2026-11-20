import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseShopItem } from "../../../../lib/api/featureInputs";
import { Dashboard, Economy } from "../../../../lib/database";

// PATCH /guilds/:guild/shop/:id with any shop item fields.
export class ShopUpdateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const { input, errors } = parseShopItem(await req.readBodyJson().catch(() => null) as Record<string, unknown> | null, access.guild, true);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        const item = await Economy.updateShopItem(access.guild.id, Number(req.params.id), input);
        if (!item) return res.status(HttpCodes.NotFound).json({ error: "Item not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "shop.update", { name: item.name, fields: Object.keys(input) });
        return res.json(item);
    }
}
