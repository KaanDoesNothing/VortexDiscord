import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";
import {VortexEmbed} from "../../lib/structures/Embed";
import {isInVoiceChannel} from "../../lib/checks/Voice";
import {isMusicPlaying} from "../../lib/checks/MusicPlaying";

export class QueueCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Queue");

    category = musicCategoryName;

    checks = [isInVoiceChannel, isMusicPlaying];

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(player.queue.length < 1) {
            await ctx.reply("Queue is empty!");
        }

        const embed = new VortexEmbed()
            .setTitle("Queue")
            .setDescription(player.queue.map((track, i) => `${i++} - ${track.title}`).join("\n"))

        return {embeds: [embed]};
    }
}