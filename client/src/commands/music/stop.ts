import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";

export class StopCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song");

    category = musicCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            await ctx.reply(NoMusicPlaying);
            return;
        }

        player.destroy();

        await ctx.reply("Leaving vc!");
    }
}