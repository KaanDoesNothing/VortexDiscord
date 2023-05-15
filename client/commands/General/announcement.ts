import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export class AnnouncementCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "announcement",
            description: "A little update"
        }

        this.category = "General";
    }

    exec(ctx: ApplicationCommandInteraction): void {
        ctx.reply(`The bot wasn't updated for a while, this is due to a lack of time, I've finally updated most of the bot and will be updating it as time goes on. some commands might be missing, you can take a look with /help`);
    }
}