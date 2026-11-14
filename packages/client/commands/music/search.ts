import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder, type GuildMember } from "discord.js";
import type { SearchPlatform } from "lavalink-client";
import { MusicCommand } from "../../lib/music/command";
import { addTracks, getOrCreatePlayer, startIfIdle } from "../../lib/music/enqueue";
import { trackDuration, trackLink } from "../../lib/music/format";
import { music } from "../../lib/music/manager";
import { replyAndFetch } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /search <query> [source]: shows the top 10 results in a menu; pick one or more to queue them.
export class SearchCommand extends MusicCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("search")
        .setDescription("Search for songs and pick which ones to queue")
        .addStringOption((o) => o.setName("query").setDescription("What to search for").setMaxLength(200).setRequired(true))
        .addStringOption((o) => o.setName("source").setDescription("Where to search").addChoices(
            { name: "YouTube", value: "ytsearch" }, { name: "YouTube Music", value: "ytmsearch" },
            { name: "SoundCloud", value: "scsearch" }, { name: "Spotify", value: "spsearch" }, { name: "Deezer", value: "dzsearch" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { player: false });
        if (!ready) return;
        const { settings, member } = ready;
        const query = ctx.options.getString("query", true);
        const source = (ctx.options.getString("source") ?? settings.searchSource) as SearchPlatform;

        // Search through any connected node without joining voice yet.
        const node = [...music!.nodeManager.nodes.values()].find((n) => n.connected)!;
        const result = await node.search({ query, source }, ctx.user).catch((error) => {
            this.container.logger.error(`[music] search failed in ${ctx.guildId}:`, error);
            return null;
        });
        const tracks = result?.tracks.slice(0, 10) ?? [];
        if (!tracks.length) return ctx.reply({ content: `No results for **${query.slice(0, 100)}**.`, ephemeral: true });

        const embed = new VortexEmbed()
            .setTitle(`🔎 Results for "${query.slice(0, 80)}"`)
            .setDescription(tracks.map((t, i) => `\`${i + 1}.\` ${trackLink(t, 55)} \`${trackDuration(t)}\``).join("\n"))
            .setFooter({ text: "Pick one or more within 60 seconds" });

        const menu = new StringSelectMenuBuilder()
            .setCustomId("pick")
            .setPlaceholder("Choose songs to queue")
            .setMinValues(1)
            .setMaxValues(tracks.length)
            .addOptions(tracks.map((t, i) => ({
                label: t.info.title.slice(0, 100),
                description: `${t.info.author} · ${trackDuration(t)}`.slice(0, 100),
                value: String(i)
            })));

        const message = await replyAndFetch(ctx, { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] });
        const choice = await message.awaitMessageComponent({ componentType: ComponentType.StringSelect, filter: (i) => i.user.id === ctx.user.id, time: 60_000 }).catch(() => null);
        if (!choice) return message.edit({ components: [], embeds: [embed.setFooter({ text: "Timed out" })] }).catch(() => null);

        const picked = choice.values.map((v) => tracks[Number(v)]!);
        const player = await getOrCreatePlayer(member as GuildMember, ctx.channelId, settings).catch((error) => {
            this.container.logger.error(`[music] couldn't join voice in ${ctx.guildId}:`, error);
            return null;
        });
        if (!player) return choice.update({ content: "I couldn't join your voice channel.", embeds: [], components: [] });

        const { added, reason } = await addTracks(player, picked, ctx.user, settings);
        await startIfIdle(player);

        return choice.update({
            content: added ? `➕ Queued ${added === 1 ? trackLink(picked[0]!) : `${added} songs`}.${reason ? ` Some weren't added: ${reason}.` : ""}` : `Couldn't add them: ${reason}.`,
            embeds: [],
            components: []
        });
    }
}
