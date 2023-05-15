import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { Queues } from "../../lib/lavalink.ts";
import { NoMusicPlaying } from "../../lib/Language.ts";

export class PauseCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "pause",
            description: "Pause current track",
        }

        this.category = "Music";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const queue = Queues.get(ctx.guild.id);
        if(!queue) {
            ctx.reply(NoMusicPlaying);
            return;
        }

        await queue.player.pause();

        ctx.reply(`Paused!`);
    }
}