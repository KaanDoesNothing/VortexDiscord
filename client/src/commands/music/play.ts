import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder} from "discord.js";
import {GuildWarnTable} from "../../lib/Database";
import {musicCategoryName} from "./mod";

export class PlayCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song")
        .addStringOption((arg) => arg.setName("input").setDescription("URL or Query").setRequired(true));

    category = musicCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const query = ctx.options.getString("input");

        const voiceChannel = ctx.guild.members.cache.get(ctx.user.id).voice.channel;

        const player = this.client.music.getPlayer(ctx.guildId) || await this.client.music.createPlayer({
            guildId: ctx.guild.id,
            textId: ctx.channel.id,
            voiceId: voiceChannel.id,
            volume: 100
        });

        let result = await this.client.music.search(query, {requester: ctx.user});
        if (!result.tracks.length) {
            await ctx.reply("No results found!");
            return;
        }

        if (result.type === "PLAYLIST") for (let track of result.tracks) player.queue.add(track);
        else player.queue.add(result.tracks[0]);

        if (!player.playing && !player.paused) await player.play();
        await ctx.reply({content: result.type === "PLAYLIST" ? `Queued ${result.tracks.length} from ${result.playlistName}` : `Queued ${result.tracks[0].title}`});
    }
}