import {Context} from "oak/context.ts";
import {client} from "../../index.ts";
import {verifyJWT} from "./utils.ts";

export const getUser = async (ctx: Context, next) => {
    const {key} = await ctx.request.body({type: "json"}).value;
    if(!key) {
        ctx.response.body = {error: "No key was provided"};
        return;
    }

    try {
        const jwtData = await verifyJWT(key);

        ctx.session = {
            user: jwtData.user,
            key
        }

        await next();
    }catch(_err) {
        console.log(_err);
        ctx.response.body = {error: "Invalid key!"};
        return;
    }
}

export const getGuild = async (ctx: Context, next) => {
    try {
        const {guild_id} = await ctx.request.body({type: "json"}).value;

        const guild = await client.guilds.get(guild_id) || await client.guilds.fetch(guild_id);

        const member = await guild.members.fetch(ctx.session.user.id);

        const hasPermissions = member.permissions.has("ADMINISTRATOR") || guild.permissions.has("MANAGE_GUILD");

        if(!hasPermissions) {
            ctx.response.body = {error: "Invalid permissions"};
            return;
        }

        ctx.session.guild = guild;

        await next();
    }catch(err) {
        console.log(err)
    }
}