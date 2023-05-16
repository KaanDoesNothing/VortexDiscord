import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { Queue, Queues, lavaNode } from "../../lib/lavalink.ts";

export class PlayCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "play",
            description: "Play a song",
            options: [
                {
                    name: "song",
                    required: true,
                    description: "URL or Name",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Music";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const url = ctx.option("song") as string;

        const res = await lavaNode.rest.loadTracks(url);

        if(res.loadType === "TRACK_LOADED") {
            const vc = await ctx.guild.voiceStates.get(ctx.user.id);
            const queue = Queues.get(ctx.guild.id) || new Queue(ctx.guild.id, vc.channelID, ctx.channel.id);

            const connect = queue.player.connect(BigInt(vc.channelID), {deafen: true});

            res.tracks.forEach((track) => queue.add(track));

            if(!queue.player.playing) {
                queue.play();

                ctx.reply("I will now start playing!");
            }else {
                ctx.reply(`Added: ${res.tracks[0].info.title}`);
            }
        }
        // const MusicManager = this.client.MusicManager;

        // const res = await this.client.vulkava.search(url);

        // console.log(res);
		// let player = MusicManager.manager.get(ctx.guild.id);

		// if(!player) {
		// 	player = MusicManager.manager.create({
		// 		guild: ctx.guild.id,
		// 		voiceChannel: ctx.member.c,
		// 		textChannel: msg.channel.id
		// 	});
			
		// 	player.connect();
		// }

		// player.queue.add(res.tracks[0]);
		// msg.channel.send(`Added ${res.tracks[0].title} to the queue`);

		// if (!player.playing && !player.paused && !player.queue.size) { 
		// 	await player.play();
		// }

		// if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) {
		// 	await player.play();
		// }
    }
}