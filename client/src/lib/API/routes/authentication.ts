import {Router} from "express";
import {client} from "../../../index";
import {authClient} from "../authClient";

export const authRouter = Router();

authRouter.get("/details", (req, res) => {
    return res.json(authClient.auth);
});