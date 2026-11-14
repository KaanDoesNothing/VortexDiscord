import { HttpCodes, Route } from "@sapphire/plugin-api";
import { eq } from "drizzle-orm";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { readBody, requireOwner } from "../../../lib/api/auth";
import { db, DBManager, tables } from "../../../lib/database";

const MAX = 1_000_000_000_000;

// PATCH /owner/users/:id with any of { balance, bank, bio }: edit a user's economy data.
export class OwnerUpdateUserRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const auth = requireOwner(req, res);
        if (!auth) return;
        const body = await readBody(req, res);
        if (!body) return;

        const id = req.params.id ?? "";
        const update: { balance?: number; bank?: number; bio?: string } = {};

        for (const key of ["balance", "bank"] as const) {
            if (body[key] === undefined) continue;
            const n = Number(body[key]);
            if (!Number.isInteger(n) || n < 0 || n > MAX) return res.status(HttpCodes.BadRequest).json({ error: `${key} must be a whole number from 0 to ${MAX}` });
            update[key] = n;
        }
        if (body.bio !== undefined) {
            if (typeof body.bio !== "string" || !body.bio.trim() || body.bio.length > 100) return res.status(HttpCodes.BadRequest).json({ error: "Bio must be 1-100 characters" });
            update.bio = body.bio;
        }
        if (!Object.keys(update).length) return res.status(HttpCodes.BadRequest).json({ error: "Nothing to update" });

        await DBManager.getUser(id);
        await db.update(tables.users).set(update).where(eq(tables.users.id, id));
        this.container.logger.info(`Owner ${auth.id} edited user ${id}: ${JSON.stringify(update)}`);

        return res.json({ ok: true });
    }
}
