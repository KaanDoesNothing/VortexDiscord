import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder, User} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";
import {VortexEmbed} from "../../lib/structures/Embed";
import {millisToMinutesAndSeconds} from "../../lib/utils/time";

export class NowPlayingCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Shows the current playing song");

    category = musicCategoryName;
    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            return {content: NoMusicPlaying};
        }

        const track = player.queue.current;

        console.log(track.requester);

        const embed = new VortexEmbed()
            .setThumbnail(track.thumbnail)
            .setTitle(`Now playing: ${track.title}`)
            .setDescription(`${millisToMinutesAndSeconds(player.position)} / ${millisToMinutesAndSeconds(track.length)}`)
            .setFooter({text: `Requested by ${(track.requester as User).username}`})


        return {embeds: [embed]};
    }
}