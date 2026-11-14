import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { requireOwner } from "../../lib/api/auth";
import { getPage, getQuery } from "../../lib/api/http";

// GET /owner/guilds?search=&sort=members|joined|name&page=: every server the bot is in.
export class OwnerGuildsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        const page = getPage(req, 50);
        const search = getQuery(req, "search")?.toLowerCase();
        const sort = getQuery(req, "sort") ?? "members";

        let guilds = [...this.container.client.guilds.cache.values()];
        if (search) guilds = guilds.filter((g) => g.name.toLowerCase().includes(search) || g.id === search);

        guilds.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name)
            : sort === "joined" ? (b.joinedTimestamp ?? 0) - (a.joinedTimestamp ?? 0)
            : b.memberCount - a.memberCount);

        const slice = guilds.slice((page.page - 1) * page.limit, page.page * page.limit);
        return res.json({
            ...page,
            total: guilds.length,
            rows: slice.map((g) => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL({ size: 64, extension: "webp" }),
                memberCount: g.memberCount,
                ownerId: g.ownerId,
                shardId: g.shardId,
                joinedAt: g.joinedAt?.toISOString() ?? null
            }))
        });
    }
}
