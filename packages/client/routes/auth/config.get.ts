import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";

/** GET /auth/config: what the frontend needs to build the Discord login link. */
export class AuthConfigRoute extends ApiRoute {
    public run(_req: Route.Request, res: Route.Response) {
        const auth = this.container.server.auth;

        if (!auth) return res.json({ enabled: false });

        return res.json({
            enabled: true,
            clientId: auth.id,
            scopes: auth.scopes,
            redirectUri: auth.redirect ?? null
        });
    }
}
