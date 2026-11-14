import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson, truncate } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface OnThisDay {
    events?: { text: string; year: number; pages?: { content_urls?: { desktop?: { page: string } } }[] }[];
    births?: { text: string; year: number }[];
}

// /onthisday [type]: historical events (or famous birthdays) on today's date, from Wikipedia.
export class OnThisDayCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["history", "today"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("onthisday")
        .setDescription("What happened on this day in history")
        .addStringOption((o) => o.setName("type").setDescription("What to show").addChoices(
            { name: "Events", value: "events" },
            { name: "Famous birthdays", value: "births" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const type = (ctx.options.getString("type") ?? "events") as "events" | "births";
        const now = new Date();
        const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(now.getUTCDate()).padStart(2, "0");
        await ctx.deferReply();

        try {
            const data = await getJson<OnThisDay>(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/${type}/${mm}/${dd}`, { cacheMs: 3_600_000 });
            const items = (data[type] ?? []).slice();
            if (!items.length) return ctx.editReply("Nothing found for today.");

            // A random selection of 6, shown oldest first.
            const picked = items.sort(() => Math.random() - 0.5).slice(0, 6).sort((a, b) => a.year - b.year);
            const lines = picked.map((e) => `**${e.year}**: ${truncate(e.text, 200)}`);

            const date = now.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
            const embed = new VortexEmbed()
                .setTitle(`📅 ${type === "births" ? "Born" : "On this day"}: ${date}`)
                .setDescription(lines.join("\n\n"))
                .setFooter({ text: "Source: Wikipedia · run again for different picks" });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
