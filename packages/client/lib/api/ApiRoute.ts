import { Route } from "@sapphire/plugin-api";
import { relative } from "node:path";

// Base class for every API route.
//
// Sapphire keys pieces by file name, so routes/commands/index.get.ts and
// routes/guilds/[guild]/index.get.ts would both be called "index.get" and the second one
// would silently unload the first. Naming each route after its path inside routes/ keeps
// them unique. The URL still comes from the file location as usual.
export abstract class ApiRoute extends Route {
    public constructor(context: Route.LoaderContext, options: Route.Options = {}) {
        const name = relative(context.root, context.path)
            .replace(/\\/g, "/")
            .replace(/\.[cm]?[jt]s$/, "");

        // The loader always passes { name: <file name> }, so only keep options.name if a route set its own.
        const custom = options.name && options.name !== context.name ? options.name : undefined;

        super(context, { ...options, name: custom ?? name });
    }
}
