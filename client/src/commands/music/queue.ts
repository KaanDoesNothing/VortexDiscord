import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";
import {VortexEmbed} from "../../lib/structures/Embed";

export class QueueCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Queue");

    category = musicCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            await ctx.reply(NoMusicPlaying);
            return;
        }

        if(player.queue.length < 1) {
            await ctx.reply("Queue is empty!");
        }

        const embed = new VortexEmbed()
            .setTitle("Queue")
            .setDescription(player.queue.map((track, i) => `${i++} - ${track.title}`).join("\n"))

        await ctx.reply({embeds: [embed]});
    }
}