import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { MusicCommand } from "../../lib/music/command";
import { queueEmbed } from "../../lib/music/ui";
import { replyAndFetch } from "../../lib/structures/command";

// /queue [page]: what's coming up, 10 songs per page, with page buttons.
export class QueueCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["q"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("queue")
        .setDescription("See what's playing and what's coming up")
        .addIntegerOption((o) => o.setName("page").setDescription("Page number").setMinValue(1));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { sameChannel: false });
        if (!ready) return;
        const { player } = ready;

        let page = ctx.options.getInteger("page") ?? 1;
        const pages = () => Math.max(1, Math.ceil(player.queue.tracks.length / 10));

        const buttons = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("prev").setEmoji("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
            new ButtonBuilder().setCustomId("next").setEmoji("▶️").setStyle(ButtonStyle.Secondary).setDisabled(page >= pages())
        );

        const message = await replyAndFetch(ctx, { embeds: [queueEmbed(player, page)], components: pages() > 1 ? [buttons()] : [] });
        if (pages() <= 1) return;

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 120_000 });
        collector.on("collect", (i) => {
            page += i.customId === "next" ? 1 : -1;
            page = Math.min(Math.max(1, page), pages());
            return i.update({ embeds: [queueEmbed(player, page)], components: [buttons()] });
        });
        collector.on("end", () => message.edit({ components: [] }).catch(() => null));
    }
}
