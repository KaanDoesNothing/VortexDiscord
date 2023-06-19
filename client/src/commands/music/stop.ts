import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";

export class StopCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop playing music");

    category = musicCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            return {content: NoMusicPlaying};
        }

        player.destroy();

        return {content: "Leaving vc!"};
    }
}