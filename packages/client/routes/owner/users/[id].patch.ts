import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { readBody, requireOwner } from "../../../lib/api/auth";
import { DBManager, Economy } from "../../../lib/database";
import { DEFAULT_SETTINGS } from "../../../lib/settings";

const MAX = 1_000_000_000_000;

// PATCH /owner/users/:id with any of { balance, bank, bio }: edit a user's global wallet and bio.
export class OwnerUpdateUserRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const auth = requireOwner(req, res);
        if (!auth) return;
        const body = await readBody(req, res);
        if (!body) return;

        const id = req.params.id ?? "";
        const wallet: { balance?: number; bank?: number } = {};
        let bio: string | undefined;

        for (const key of ["balance", "bank"] as const) {
            if (body[key] === undefined) continue;
            const n = Number(body[key]);
            if (!Number.isInteger(n) || n < 0 || n > MAX) return res.status(HttpCodes.BadRequest).json({ error: `${key} must be a whole number from 0 to ${MAX}` });
            wallet[key] = n;
        }
        if (body.bio !== undefined) {
            if (typeof body.bio !== "string" || !body.bio.trim() || body.bio.length > 100) return res.status(HttpCodes.BadRequest).json({ error: "Bio must be 1-100 characters" });
            bio = body.bio;
        }
        if (!Object.keys(wallet).length && bio === undefined) return res.status(HttpCodes.BadRequest).json({ error: "Nothing to update" });

        // Edits the shared (global) wallet.
        if (Object.keys(wallet).length) await Economy.setWallet("global", id, wallet, DEFAULT_SETTINGS.economy.startingBalance);
        if (bio !== undefined) await DBManager.setBio(id, bio);
        this.container.logger.info(`Owner ${auth.id} edited user ${id}: ${JSON.stringify({ ...wallet, bio })}`);

        return res.json({ ok: true });
    }
}
