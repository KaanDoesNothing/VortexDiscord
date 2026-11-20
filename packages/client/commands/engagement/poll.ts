import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Engagement } from "../../lib/database";
import { renderPoll } from "../../lib/engagement";
import { formatDuration, parseDuration, schedule } from "../../lib/scheduler";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";

// /poll <question> <options> [duration]: a button poll with live results.
// Options are separated by "|" (2 to 10). With a duration, it closes automatically.
export class PollCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create a poll with buttons and live results")
        .addStringOption((o) => o.setName("question").setDescription("What to ask").setMaxLength(250).setRequired(true))
        .addStringOption((o) => o.setName("options").setDescription("2-10 choices separated by |, e.g. Pizza | Tacos | Sushi").setMaxLength(1000).setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("Close automatically after, e.g. 1h or 2d (optional)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const question = ctx.options.getString("question", true);
        const options = ctx.options.getString("options", true).split("|").map((o) => o.trim()).filter(Boolean);
        const durationInput = ctx.options.getString("duration");

        if (options.length < 2 || options.length > 10) return ctx.reply({ content: "Give 2 to 10 options separated by `|`, e.g. `Pizza | Tacos`.", flags: MessageFlags.Ephemeral });
        if (options.some((o) => o.length > 80)) return ctx.reply({ content: "Each option can be at most 80 characters.", flags: MessageFlags.Ephemeral });

        const durationMs = durationInput ? parseDuration(durationInput) : null;
        if (durationInput && (!durationMs || durationMs > 30 * 86_400_000)) return ctx.reply({ content: "Give a duration like `1h` or `2d` (max 30d).", flags: MessageFlags.Ephemeral });

        const poll = await Engagement.createPoll({ guildId: ctx.guildId!, channelId: ctx.channelId, question, options, authorId: ctx.user.id });
        const message = await replyAndFetch(ctx, {
            ...renderPoll(poll, options.map(() => 0)),
            content: durationMs ? `Closes in ${formatDuration(durationMs)}` : undefined
        });
        await Engagement.setPollMessage(poll.id, message.id);

        if (durationMs) await schedule({ type: "poll_end", guildId: ctx.guildId, runAt: new Date(Date.now() + durationMs), payload: { pollId: poll.id }, createdBy: ctx.user.id });
    }
}
