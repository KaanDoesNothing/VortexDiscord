import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder} from "discord.js";
import {GuildWarnTable} from "../../lib/Database";
import {musicCategoryName} from "./mod";

export class SkipCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song");

    category = musicCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const player = this.client.music.getPlayer(ctx.guildId);

        player.skip();

        await ctx.reply("Skipped current song!");
    }
}