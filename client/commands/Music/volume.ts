import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { Queues } from "../../lib/lavalink.ts";
import { NoMusicPlaying } from "../../lib/Language.ts";

export class VolumeCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "volume",
            description: "Set the volume",
            options: [
                {
                    name: "amount",
                    description: "Amount",
                    required: true,
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Music";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const volume = ctx.option("volume") as number;

        const queue = Queues.get(ctx.guild.id);
        if(!queue) {
            ctx.reply(NoMusicPlaying);
            return;
        }

        await queue.player.setVolume(volume);

        ctx.reply(`Volume changed!`);
    }
}