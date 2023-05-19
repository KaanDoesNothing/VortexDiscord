import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";
import { authClient } from "../authClient.ts";
import {createJWT} from "../utils.ts";
import {getUser} from "../middleware.ts";

export const authRouter = new Router({prefix: "/authentication"});

authRouter.get("/details", (ctx) => {
    ctx.response.body = authClient.auth;
});

authRouter.post("/", async (ctx) => {
    const {code} = await ctx.request.body({type: "json"}).value;
    if(!code) {
        ctx.response.body = {error: "No code provided"};
        return;
    }

    try {
        const userKey = await authClient.getAccess(code);
        const user = await authClient.getUser(userKey).catch(err => console.log(err));

        const jwt = await createJWT({user_id: user.id, user, createdAt: Date.now()});
        ctx.response.body = {key: jwt};
    }catch(err) {
        console.log(err);
        ctx.response.body = {error: true};
    }
});

authRouter.post("/user", getUser ,(ctx) => {
    ctx.response.body = ctx.session.user;
});

authRouter.post("/guilds", getUser, async (ctx) => {
    const guildsArray = await client.guilds.array();
    const guilds = [];

    for (const i in guildsArray) {
        const guild = guildsArray[i];
        let member = await guild.members.fetch(ctx.session.user.id);
        if(member) member = await guild.members.fetch(ctx.session.user.id);
        if(!member) continue;

        console.log(member.permissions);

        guilds.push({
            id: guild.id,
            name: guild.name,
            permissions: member.permissions.toArray(),
            iconUrl: guild.iconURL("png", 512)
        });
    }

    console.log(guilds);

    ctx.response.body = guilds;
});