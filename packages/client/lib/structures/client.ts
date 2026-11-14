import { SapphireClient } from "@sapphire/framework";
import type { ClientOptions } from "discord.js";

// The bot's client. Sapphire loads commands/, listeners/, preconditions/ and routes/
// automatically from the folder containing the entry file (index.ts).
export class VortexClient extends SapphireClient {
    public constructor(options: ClientOptions) {
        super(options);
    }
}
