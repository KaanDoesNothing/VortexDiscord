import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Player, Track } from "lavalink-client";
import { VortexEmbed } from "../structures/embed";
import { progressBar, requesterOf, SOURCE_LABELS, trackDuration, trackLink, formatTime } from "./format";

// Embeds and buttons for the music system. Button IDs are "music:<action>" (interaction-handlers/music.ts).

const LOOP_LABEL = { off: "Loop: off", track: "Loop: song", queue: "Loop: queue" } as const;

// Playback controls shown under the now-playing card and /nowplaying.
export function controlRows(player: Player) {
    const paused = player.paused;
    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("music:previous").setEmoji("⏮️").setStyle(ButtonStyle.Secondary).setDisabled(!player.queue.previous.length),
            new ButtonBuilder().setCustomId(paused ? "music:resume" : "music:pause").setEmoji(paused ? "▶️" : "⏸️").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("music:skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger)
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("music:loop").setLabel(LOOP_LABEL[player.repeatMode]).setEmoji("🔁")
                .setStyle(player.repeatMode === "off" ? ButtonStyle.Secondary : ButtonStyle.Success),
            new ButtonBuilder().setCustomId("music:shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary).setDisabled(player.queue.tracks.length < 2),
            new ButtonBuilder().setCustomId("music:voldown").setEmoji("🔉").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:volup").setEmoji("🔊").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("music:queue").setEmoji("📜").setLabel(String(player.queue.tracks.length)).setStyle(ButtonStyle.Secondary)
        )
    ];
}

// The "Now playing" card: artwork, progress, requester, volume, loop, what's next.
export function nowPlayingEmbed(player: Player, track: Track) {
    const requester = requesterOf(track);
    const position = player.position ?? 0;
    const next = player.queue.tracks[0];

    const embed = new VortexEmbed()
        .setAuthor({ name: player.paused ? "⏸️ Paused" : "🎶 Now playing" })
        .setTitle(track.info.title.slice(0, 256))
        .setURL(track.info.uri || null)
        .setDescription(`by **${track.info.author}**\n\n${progressBar(position, track.info.isStream ? 0 : track.info.duration)}\n\`${formatTime(position)} / ${trackDuration(track)}\``)
        .addField("Volume", `${player.volume}%`, true)
        .addField("Loop", { off: "Off", track: "Song", queue: "Queue" }[player.repeatMode], true)
        .addField("Up next", next ? trackLink(next, 40) : player.get("autoplay") ? "Autoplay" : "Nothing", true)
        .setFooter({
            text: `${SOURCE_LABELS[track.info.sourceName] ?? track.info.sourceName}${requester ? ` · requested by ${requester.username}` : ""}`,
            iconURL: requester?.avatar || undefined
        });

    if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
    return embed;
}

export function nowPlayingMessage(player: Player, track: Track) {
    return { embeds: [nowPlayingEmbed(player, track)], components: controlRows(player), allowedMentions: { parse: [] as never[] } };
}

// One page of the queue (10 per page).
export function queueEmbed(player: Player, page: number) {
    const perPage = 10;
    const tracks = player.queue.tracks;
    const pages = Math.max(1, Math.ceil(tracks.length / perPage));
    const p = Math.min(Math.max(1, page), pages);
    const current = player.queue.current;

    const lines = tracks.slice((p - 1) * perPage, p * perPage).map((t, i) => {
        const requester = requesterOf(t);
        return `\`${(p - 1) * perPage + i + 1}.\` ${trackLink(t, 50)} \`${trackDuration(t)}\`${requester ? ` · ${requester.username}` : ""}`;
    });

    const total = player.queue.utils.totalDuration();
    return new VortexEmbed()
        .setTitle(`📜 Queue · ${tracks.length} song${tracks.length === 1 ? "" : "s"}`)
        .setDescription(`${current ? `**Now:** ${trackLink(current, 60)} \`${trackDuration(current)}\`\n\n` : ""}${lines.join("\n") || "*Nothing queued. Add songs with `/play`.*"}`)
        .setFooter({ text: `Page ${p}/${pages} · total ${formatTime(total)}${player.repeatMode !== "off" ? ` · looping ${player.repeatMode === "track" ? "song" : "queue"}` : ""}` });
}
