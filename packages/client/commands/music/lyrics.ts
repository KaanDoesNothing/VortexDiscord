import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { MusicCommand } from "../../lib/music/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /lyrics: lyrics for the current song, fetched by NodeLink (needs its lyrics support enabled).
export class LyricsCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["ly"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Show the lyrics of the current song");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { sameChannel: false });
        if (!ready) return;
        const track = ready.player.queue.current;
        if (!track) return ctx.reply({ content: "Nothing is playing right now.", ephemeral: true });

        await ctx.deferReply();
        const lyrics = await ready.player.getCurrentLyrics().catch(() => null);
        const text = lyrics?.text ?? lyrics?.lines?.map((l) => l.line).join("\n");
        if (!text?.trim()) return ctx.editReply(`No lyrics found for **${track.info.title}**.`);

        // Embed descriptions max out at 4096 characters.
        const clipped = text.length > 4000 ? `${text.slice(0, 4000).replace(/\n[^\n]*$/, "")}\n…` : text;
        const embed = new VortexEmbed()
            .setTitle(`🎤 ${track.info.title}`.slice(0, 256))
            .setURL(track.info.uri || null)
            .setDescription(clipped)
            .setFooter({ text: `${track.info.author}${lyrics?.provider ? ` · lyrics from ${lyrics.provider}` : ""}` });
        if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);

        return ctx.editReply({ embeds: [embed] });
    }
}
