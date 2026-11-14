import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireOwner } from "../../../lib/api/auth";
import { Utility } from "../../../lib/database";

// GET /owner/blacklist: blacklisted users and servers, with names where the bot can resolve them.
export class OwnerBlacklistRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        const { client } = this.container;
        const rows = await Utility.listBlacklist();
        const named = await Promise.all(rows.map(async (r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            name: r.type === "guild"
                ? client.guilds.cache.get(r.id)?.name ?? null
                : (client.users.cache.get(r.id) ?? await client.users.fetch(r.id).catch(() => null))?.username ?? null
        })));
        return res.json(named);
    }
}
