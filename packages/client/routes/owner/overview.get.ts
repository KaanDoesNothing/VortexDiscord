import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { requireOwner } from "../../lib/api/auth";
import { getBotStats } from "../../lib/api/stats";
import { getGloballyDisabled, getOwners, getPresence } from "../../lib/owner";

// GET /owner/overview: everything the owner panel's home shows.
export class OwnerOverviewRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        return res.json({
            stats: await getBotStats(),
            presence: getPresence(),
            disabledCommands: getGloballyDisabled(),
            owners: getOwners(),
            membersIntent: Bun.env.DISCORD_MEMBERS_INTENT === "true"
        });
    }
}
