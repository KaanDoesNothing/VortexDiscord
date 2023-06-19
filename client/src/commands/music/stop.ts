import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";
import {isInVoiceChannel} from "../../lib/checks/Voice";
import {isMusicPlaying} from "../../lib/checks/MusicPlaying";

export class StopCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop playing music");

    category = musicCategoryName;

    checks = [isInVoiceChannel, isMusicPlaying];
    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const player = this.client.music.getPlayer(ctx.guildId);

        player.destroy();

        return {content: "Leaving vc!"};
    }
}