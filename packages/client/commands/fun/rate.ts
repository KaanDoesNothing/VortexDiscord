import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

// /rate <thing>: the bot rates anything out of 10. The same thing always gets the same score.
export class RateCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("rate")
        .setDescription("Let the bot rate anything out of 10")
        .addStringOption((o) => o.setName("thing").setDescription("What to rate").setMaxLength(200).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const thing = ctx.options.getString("thing", true).trim();

        let hash = 7;
        for (const ch of thing.toLowerCase()) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
        const score = hash % 11;
        const stars = "⭐".repeat(Math.round(score / 2)) || "💀";

        return ctx.reply({ content: `I rate **${thing}** a **${score}/10** ${stars}`, allowedMentions: { parse: [] } });
    }
}
