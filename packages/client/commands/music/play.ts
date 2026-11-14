import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type GuildMember } from "discord.js";
import type { SearchPlatform } from "lavalink-client";
import { addTracks, getOrCreatePlayer, startIfIdle } from "../../lib/music/enqueue";
import { MusicCommand } from "../../lib/music/command";
import { isDj } from "../../lib/music/guards";
import { trackDuration, trackLink } from "../../lib/music/format";
import { VortexEmbed } from "../../lib/structures/embed";

// /play <query> [source] [next]: plays a link (song or playlist from YouTube, Spotify, SoundCloud,
// Deezer, Apple Music...) or searches. Joins your voice channel if needed.
export class PlayCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["p"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist from a link or a search")
        .addStringOption((o) => o.setName("query").setDescription("Song name or link (YouTube, Spotify, SoundCloud…)").setMaxLength(500).setRequired(true))
        .addStringOption((o) => o.setName("source").setDescription("Where to search (for plain searches)").addChoices(
            { name: "YouTube", value: "ytsearch" }, { name: "YouTube Music", value: "ytmsearch" },
            { name: "SoundCloud", value: "scsearch" }, { name: "Spotify", value: "spsearch" }, { name: "Deezer", value: "dzsearch" }
        ))
        .addBooleanOption((o) => o.setName("next").setDescription("Play it next instead of at the end (DJ only)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { player: false });
        if (!ready) return;
        const { settings, member } = ready;

        const query = ctx.options.getString("query", true).trim();
        const source = (ctx.options.getString("source") ?? settings.searchSource) as SearchPlatform;
        const playNext = ctx.options.getBoolean("next") ?? false;
        // Jumping the queue affects everyone, so it needs DJ rights.
        if (playNext && !isDj(member as GuildMember, settings)) return ctx.reply({ content: "Only DJs can add songs to the front of the queue.", ephemeral: true });

        await ctx.deferReply();

        const player = await getOrCreatePlayer(member as GuildMember, ctx.channelId, settings).catch(() => null);
        if (!player) return ctx.editReply("I couldn't join your voice channel. Check that I can connect and speak there.");

        // Links are loaded directly; anything else is searched on the chosen platform.
        const isUrl = /^https?:\/\//i.test(query);
        const result = await player.search(isUrl ? query : { query, source }, ctx.user).catch(() => null);

        if (!result || result.loadType === "error") return ctx.editReply(`Couldn't load that${result?.exception?.message ? `: ${result.exception.message}` : "."}`);
        if (!result.tracks.length) return ctx.editReply(`No results for **${query.slice(0, 100)}**.`);

        const isPlaylist = result.loadType === "playlist";
        const tracks = isPlaylist ? result.tracks : [result.tracks[0]!];
        const { added, skipped, reason } = await addTracks(player, tracks, ctx.user, settings, playNext ? 0 : undefined);
        if (!added) return ctx.editReply(`Couldn't add that: ${reason}.`);

        const wasIdle = !player.playing && !player.paused;
        await startIfIdle(player);

        const embed = new VortexEmbed();
        if (isPlaylist) {
            embed.setTitle(`📃 Queued ${added} song${added === 1 ? "" : "s"}`)
                .setDescription(`from **${result.playlist?.name ?? "playlist"}**${skipped ? `\n${skipped} skipped: ${reason}.` : ""}`);
            if (result.playlist?.thumbnail) embed.setThumbnail(result.playlist.thumbnail);
        } else {
            const track = tracks[0]!;
            const position = playNext ? 1 : player.queue.tracks.length;
            embed.setTitle(wasIdle ? "🎶 Playing" : `➕ Queued${playNext ? " next" : ` at #${position}`}`)
                .setDescription(`${trackLink(track)} \`${trackDuration(track)}\`\nby ${track.info.author}`);
            if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
        }

        return ctx.editReply({ embeds: [embed] });
    }
}

