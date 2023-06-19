import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";

export class SkipCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song");

    category = musicCategoryName;
    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            return {content: NoMusicPlaying};
        }

        player.skip();

        return {content: "Skipped current song!"};
    }
}