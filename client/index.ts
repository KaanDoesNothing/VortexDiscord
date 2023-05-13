import { VortexClient } from "./lib/Client.ts";
import { initDatabase } from "./lib/Database.ts";

await initDatabase().catch(() => Deno.exit());
export const client = new VortexClient();

await client.connect();