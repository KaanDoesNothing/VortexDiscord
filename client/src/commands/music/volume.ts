import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder, User} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";
import {isInVoiceChannel} from "../../lib/checks/Voice";
import {isMusicPlaying} from "../../lib/checks/MusicPlaying";

export class VolumeCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the volume")
        .addNumberOption((arg) => arg.setName("volume").setDescription("volume").setRequired(true));

    category = musicCategoryName;

    checks = [isInVoiceChannel, isMusicPlaying];

    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const volume = ctx.options.getNumber("volume");

        const player = this.client.music.getPlayer(ctx.guildId);

        player.setVolume(volume);

        return {content: `Volume has been changed to ${volume}`};
    }
}