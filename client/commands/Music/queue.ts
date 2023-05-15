import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { Queues } from "../../lib/lavalink.ts";
import { VortexEmbed } from "../../lib/Embed.ts";
import { NoMusicPlaying } from "../../lib/Language.ts";

export class QueueCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "queue",
            description: "Show the current queue",
        }

        this.category = "Music";
    }

    exec(ctx: ApplicationCommandInteraction): void {
        const queue = Queues.get(ctx.guild.id);
        if(!queue) {
            ctx.reply(NoMusicPlaying);
            return;
        }

        const embed = new VortexEmbed()
            .setTitle("Queue")
            .setDescription(queue.tracks.map((track, i) => `${i++} - ${track.info.title}`).join("\n"))

        ctx.reply({embeds: [embed]});
    }
}