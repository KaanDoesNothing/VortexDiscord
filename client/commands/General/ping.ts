import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export default class PingCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "ping",
            description: "Woah Ping command nice hm?"
        }
    }

    exec(ctx: ApplicationCommandInteraction): void {
        ctx.reply("Pong!");
    }
}