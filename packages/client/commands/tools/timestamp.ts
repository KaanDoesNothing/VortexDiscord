import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { parseDuration } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Discord timestamp styles: <t:unix:STYLE> renders in each reader's own timezone.
const STYLES: [string, string][] = [["t", "Short time"], ["T", "Long time"], ["d", "Short date"], ["D", "Long date"], ["f", "Date & time"], ["F", "Full"], ["R", "Relative"]];

// /timestamp <when>: makes Discord timestamps that show in everyone's own timezone.
// Accepts "in 2h", "2h", a date like 2026-12-31 18:00, or a unix time.
export class TimestampCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["ts"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("timestamp")
        .setDescription("Make a timestamp that shows in everyone's own time zone")
        .addStringOption((o) => o.setName("when").setDescription("e.g. in 2h, 2026-12-31 18:00 UTC, or a unix time").setMaxLength(60).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const input = ctx.options.getString("when", true).trim();

        let date: Date | null = null;
        const relative = parseDuration(input.replace(/^in\s+/i, ""));
        if (relative) date = new Date(Date.now() + relative);
        else if (/^\d{9,13}$/.test(input)) date = new Date(input.length > 10 ? Number(input) : Number(input) * 1000);
        else {
            const parsed = new Date(input);
            if (!Number.isNaN(parsed.getTime())) date = parsed;
        }

        if (!date) return ctx.reply({ content: "Try `in 2h`, `2026-12-31 18:00 UTC` or a unix timestamp.", flags: MessageFlags.Ephemeral });

        const unix = Math.floor(date.getTime() / 1000);
        const lines = STYLES.map(([style, name]) => `<t:${unix}:${style}> · \`<t:${unix}:${style}>\` (${name})`);
        const embed = new VortexEmbed().setTitle("🕒 Discord timestamps").setDescription(`${lines.join("\n")}\n\nCopy a code and paste it in any message.`);

        return ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}
