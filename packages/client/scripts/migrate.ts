// Applies pending migrations from ./drizzle (the bot also does this on startup).
import { runMigrations } from "../lib/database";

await runMigrations();
console.log("Migrations applied.");
process.exit(0);
