import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";
import { authClient } from "../authClient.ts";

export const authRouter = new Router({prefix: "/authentication"});

authRouter.get("/details", (ctx) => {
    ctx.response.body = authClient.auth;
});

authRouter.post("/", async (ctx) => {
    const {code} = await ctx.request.body({type: "json"}).value;

    try {
        const userKey = await authClient.getAccess(code);

        ctx.response.body = {key: userKey};
    }catch(err) {
        ctx.response.body = {error: true};
    }
});

authRouter.post("/user", async (ctx) => {
    const {key} = await ctx.request.body({type: "json"}).value;

    try {
        const user = await authClient.getUser(key);

        ctx.response.body = user;
    }catch(err) {
        ctx.response.body = {error: true};
    }
});

authRouter.post("/guilds", async (ctx) => {
    const {key} = await ctx.request.body({type: "json"}).value;

    try {
        const fetchedGuilds = (await authClient.getGuilds(key)).toJSON();

        const result = [];

        for (let i in fetchedGuilds) {
            const guild = fetchedGuilds[i];
            result.push({
                ...guild,
                inGuild: (await client.guilds.get(guild.id)) !== undefined
            });
        }
        ctx.response.body = result;
    }catch(err) {
        console.log(err);
        ctx.response.body = {error: true};
    }
});