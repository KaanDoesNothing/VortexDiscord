import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {isMusicPlaying} from "../../lib/checks/MusicPlaying";
import {isInVoiceChannel} from "../../lib/checks/Voice";

export class SkipCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song");

    category = musicCategoryName;

    checks = [isInVoiceChannel, isMusicPlaying];

    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const player = this.client.music.getPlayer(ctx.guildId);

        player.skip();

        return {content: "Skipped current song!"};
    }
}