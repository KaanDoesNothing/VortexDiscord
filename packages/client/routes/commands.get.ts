import { Route } from "@sapphire/plugin-api";
import { capitalizeFirstLetter } from "@sapphire/utilities";
import type { VortexCommand } from "../lib/structures/command";

export class CommandsRoute extends Route {
    public run(req: Route.Request, res: Route.Response) {
        res.json(this.container.stores.get("commands").map(command => {
            return {
                name: command.name,
                category: capitalizeFirstLetter(command.category!),
                description: (command as VortexCommand).applicationCommandData.description
            }
        }));
    }
}