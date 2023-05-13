import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";

export const informationRouter = new Router({prefix: "/information"});

informationRouter.get("/commands", (ctx) => {
    const commands = [];

    client.executables.commands.forEach(cmd => {
        commands.push({
            name: cmd.instance.config.name,
            category: cmd.information.category,
            permissions: cmd.instance.userPermissions,
            arguments: cmd.instance.config.options || []
        });
    });

    ctx.response.body = commands;
});