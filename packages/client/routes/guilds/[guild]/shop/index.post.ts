import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseShopItem } from "../../../../lib/api/featureInputs";
import { Dashboard, Economy } from "../../../../lib/database";

const MAX_PER_GUILD = 50;

// POST /guilds/:guild/shop with { name, price, description?, emoji?, roleId?, stock?, maxPerUser?, requiredRoleId?, enabled? }
export class ShopCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const { input, errors } = parseShopItem(await req.readBodyJson().catch(() => null) as Record<string, unknown> | null, access.guild, false);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });
        if (await Economy.countShopItems(access.guild.id) >= MAX_PER_GUILD) return res.status(HttpCodes.BadRequest).json({ error: `A shop can have at most ${MAX_PER_GUILD} items` });

        const item = await Economy.createShopItem(access.guild.id, input as Economy.ShopItemInput);
        await Dashboard.addAudit(access.guild.id, access.auth.id, "shop.create", { name: item.name });
        return res.status(HttpCodes.Created).json(item);
    }
}
