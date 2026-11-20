import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { Utility } from "../../lib/database";
import { formatDuration, parseDuration, schedule } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const MAX_REMINDERS = 25;

// /remind me|list|cancel: reminders that survive restarts (stored as scheduled tasks).
export class RemindCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["reminder", "remindme"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("remind")
        .setDescription("Set reminders for later")
        .addSubcommand((s) => s.setName("me").setDescription("Remind me about something")
            .addStringOption((o) => o.setName("in").setDescription("When, e.g. 10m, 2h, 1d, 1w").setRequired(true))
            .addStringOption((o) => o.setName("about").setDescription("What to remind you of").setMaxLength(500).setRequired(true))
            .addBooleanOption((o) => o.setName("dm").setDescription("Send it as a DM instead of here")))
        .addSubcommand((s) => s.setName("list").setDescription("Show your upcoming reminders"))
        .addSubcommand((s) => s.setName("cancel").setDescription("Cancel a reminder")
            .addIntegerOption((o) => o.setName("id").setDescription("The reminder ID from /remind list").setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        switch (ctx.options.getSubcommand()) {
            case "me": {
                const ms = parseDuration(ctx.options.getString("in", true));
                if (!ms || ms < 30_000 || ms > 365 * 86_400_000) return ctx.reply({ content: "Give a time like `10m`, `2h` or `3d` (30 seconds to 1 year).", flags: MessageFlags.Ephemeral });

                const existing = await Utility.listUserReminders(ctx.user.id);
                if (existing.length >= MAX_REMINDERS) return ctx.reply({ content: `You can have at most ${MAX_REMINDERS} reminders. Cancel some with \`/remind cancel\`.`, flags: MessageFlags.Ephemeral });

                const runAt = new Date(Date.now() + ms);
                const id = await schedule({
                    type: "reminder",
                    guildId: ctx.guildId,
                    runAt,
                    payload: { userId: ctx.user.id, channelId: ctx.channelId, message: ctx.options.getString("about", true), dm: ctx.options.getBoolean("dm") ?? !ctx.guildId },
                    createdBy: ctx.user.id
                });

                return ctx.reply({ content: `⏰ Got it! I'll remind you ${time(runAt, "R")} (in ${formatDuration(ms)}). Reminder #${id}.`, flags: MessageFlags.Ephemeral });
            }
            case "list": {
                const reminders = await Utility.listUserReminders(ctx.user.id);
                const embed = new VortexEmbed().setTitle("⏰ Your reminders").setDescription(reminders.length
                    ? reminders.map((r) => `\`#${r.id}\` ${time(r.runAt, "R")}: ${String((r.payload as { message: string }).message).slice(0, 100)}`).join("\n")
                    : "No reminders. Set one with `/remind me`.");
                return ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case "cancel": {
                const id = ctx.options.getInteger("id", true);
                const removed = await Utility.deleteUserReminder(ctx.user.id, id);
                return ctx.reply({ content: removed ? `Reminder #${id} cancelled.` : "You don't have a reminder with that ID.", flags: MessageFlags.Ephemeral });
            }
        }
    }
}

