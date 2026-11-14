import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { requireAuth } from "../../lib/api/auth";
import { isOwner } from "../../lib/owner";

/** GET /auth/me: the logged-in user. */
export class AuthMeRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const auth = requireAuth(req, res);
        if (!auth) return;

        const user = await this.container.client.users.fetch(auth.id);

        return res.json({
            id: user.id,
            username: user.username,
            displayName: user.globalName ?? user.username,
            avatar: user.displayAvatarURL({ size: 128, extension: "webp" }),
            // Shows the owner panel in the dashboard.
            isOwner: isOwner(user.id)
        });
    }
}
