import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export class PingCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "ping",
            description: "Woah Ping command nice hm?"
        }

        this.category = "General";
    }

    exec(ctx: ApplicationCommandInteraction): void {
        ctx.reply("Pong!");
    }
}