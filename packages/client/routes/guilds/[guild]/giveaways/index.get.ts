import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { resolveUsers } from "../../../../lib/api/http";
import { Engagement } from "../../../../lib/database";

// GET /guilds/:guild/giveaways: recent giveaways with entry counts and winners.
export class GiveawayListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const list = await Engagement.listGiveaways(access.guild.id);
        const users = await resolveUsers(list.flatMap((g) => [g.hostId, ...g.winners]));

        return res.json({
            users,
            rows: list.map((g) => ({
                id: g.id, prize: g.prize, channelId: g.channelId, winnerCount: g.winnerCount, hostId: g.hostId,
                endsAt: g.endsAt.toISOString(), ended: g.ended, entries: g.entrants.length, winners: g.winners
            }))
        });
    }
}
