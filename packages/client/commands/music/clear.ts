import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { MusicCommand } from "../../lib/music/command";
import { requesterOf } from "../../lib/music/format";

// /clear [mine]: empties the upcoming queue (the current song keeps playing). "mine" removes only your songs.
export class ClearQueueCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["clearqueue", "cq"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Clear the upcoming songs (the current song keeps playing)")
        .addBooleanOption((o) => o.setName("mine").setDescription("Only remove songs you added"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const mine = ctx.options.getBoolean("mine") ?? false;
        // Clearing everyone's songs is a DJ action; clearing your own isn't.
        const ready = await this.prepare(ctx, { dj: !mine });
        if (!ready) return;
        const { player } = ready;

        const indexes = player.queue.tracks
            .map((t, i) => (!mine || requesterOf(t)?.id === ctx.user.id ? i : -1))
            .filter((i) => i >= 0);
        if (!indexes.length) return ctx.reply({ content: mine ? "You don't have any songs queued." : "The queue is already empty.", ephemeral: true });

        await player.queue.remove(indexes);
        return ctx.reply({ content: `🧹 Removed ${indexes.length} song${indexes.length === 1 ? "" : "s"}${mine ? " you added" : ""}.` });
    }
}
