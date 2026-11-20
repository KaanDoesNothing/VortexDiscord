import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type GuildMember, MessageFlags } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";
import { requesterOf, trackLink } from "../../lib/music/format";
import { isDj } from "../../lib/music/guards";

// /remove <position>: removes a song from the queue. Anyone can remove their own songs; DJs can remove any.
export class RemoveCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["rm"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a song from the queue")
        .addIntegerOption((o) => o.setName("position").setDescription("Its number in /queue").setMinValue(1).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx);
        if (!ready) return;
        const { player, settings } = ready;

        const index = ctx.options.getInteger("position", true) - 1;
        const track = player.queue.tracks[index];
        if (!track) return ctx.reply({ content: `There are only ${player.queue.tracks.length} songs in the queue.`, flags: MessageFlags.Ephemeral });

        if (requesterOf(track)?.id !== ctx.user.id && !isDj(ctx.member as GuildMember, settings, player)) {
            return ctx.reply({ content: "You can only remove songs you added (DJs can remove any).", flags: MessageFlags.Ephemeral });
        }

        await Music.removeAt(player, index);
        return ctx.reply({ content: `🗑️ Removed ${trackLink(track)}.`, allowedMentions: { parse: [] } });
    }
}
