import { VortexClient } from "./lib/Client.ts";
import { initDatabase } from "./lib/Database.ts";

await initDatabase().catch(() => Deno.exit());
new VortexClient().connect();