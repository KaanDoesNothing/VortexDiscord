// Loads every command, listener, precondition and API route the same way the bot does at startup,
// without logging in to Discord, and reports problems. Run with: bun run check
//
// Catches: files that fail to import, pieces whose names clash (Sapphire silently keeps only one),
// and invalid slash command definitions. Also prints every API route.
import "@sapphire/plugin-api/register";
import { container, LogLevel } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { join } from "node:path";
import { VortexClient } from "../lib/structures/client";

// packages/client: the folder holding commands/, listeners/, preconditions/ and routes/.
const root = join(import.meta.dir, "..");
const { Glob } = Bun;

const client = new VortexClient({
    intents: [GatewayIntentBits.Guilds],
    logger: { level: LogLevel.Warn },
    api: { listenOptions: { port: 0 } }
});

// Normally done inside client.login(); here we load without logging in.
client.stores.registerPath(root);
await client.stores.load();

let problems = 0;
const ours = <T extends { location: { full: string } }>(pieces: Iterable<T>) => [...pieces].filter((p) => p.location.full.startsWith(root));
// Counts exported classes, and how many of them can switch themselves off (enabled: Boolean(...)),
// e.g. music listeners when no NodeLink server is configured.
const countExports = async (dir: string) => {
    let classes = 0, optional = 0;
    for await (const file of new Glob(`${dir}/**/*.ts`).scan(root)) {
        const text = await Bun.file(join(root, file)).text();
        classes += (text.match(/^export (abstract )?class /gm) ?? []).length;
        optional += (text.match(/enabled: Boolean\(/g) ?? []).length;
    }
    return { classes, optional };
};

// Each exported class should become exactly one loaded piece; fewer means a name clash.
for (const name of ["commands", "listeners", "preconditions", "routes", "interaction-handlers"] as const) {
    const store = container.stores.get(name) as unknown as Map<string, { location: { full: string } }>;
    const loaded = ours(store.values()).length;
    const { classes, optional } = await countExports(name);
    // Optional pieces may be switched off; anything else missing means a name clash or load error.
    const ok = loaded <= classes && loaded >= classes - optional;
    if (!ok) problems++;
    const off = classes - loaded;
    console.log(`${ok ? "✓" : "✗"} ${name.padEnd(14)} ${loaded}/${classes} loaded${ok && off ? ` (${off} switched off: feature not configured)` : ""}`);
}

// Every command's slash definition must build (discord.js validates names, lengths and option order).
for (const command of container.stores.get("commands").values()) {
    const data = (command as unknown as { applicationCommandData?: { toJSON(): unknown } }).applicationCommandData;
    try {
        if (!data) throw new Error("no slash definition");
        data.toJSON();
    } catch (error) {
        console.log(`  ✗ ${command.name}: ${(error as Error).message}`);
        problems++;
    }
}

console.log("\nAPI routes:");
const routes = ours(container.stores.get("routes").values()).sort((a, b) => a.path.join("/").localeCompare(b.path.join("/")));
for (const route of routes) console.log(`  ${[...route.methods].join(",").padEnd(7)} /${route.path.join("/")}`);

console.log(problems ? `\n${problems} problem(s) found` : "\nAll pieces loaded cleanly.");
await client.destroy();
process.exit(problems ? 1 : 0);
