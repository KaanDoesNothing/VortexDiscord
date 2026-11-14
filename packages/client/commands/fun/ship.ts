import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Same pair always gets the same score (order doesn't matter), so it can't be re-rolled.
function compatibility(a: string, b: string) {
    const key = [a, b].sort().join(":");
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash % 101;
}

const VERDICTS: [number, string][] = [[90, "Soulmates! 💞"], [70, "A great match! 💖"], [50, "There's something there 💗"], [30, "Could work… maybe 🤔"], [10, "Just friends 🙂"], [0, "Not meant to be 💔"]];

// /ship <user> [user2]: a (completely scientific) love meter between two people.
export class ShipCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["love", "match"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ship")
        .setDescription("How compatible are two people? A totally scientific love meter")
        .addUserOption((o) => o.setName("user").setDescription("First person").setRequired(true))
        .addUserOption((o) => o.setName("user2").setDescription("Second person (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const a = ctx.options.getUser("user", true);
        const b = ctx.options.getUser("user2") ?? ctx.user;
        const score = a.id === b.id ? 100 : compatibility(a.id, b.id);

        // Combine the first half of one name with the second half of the other.
        const shipName = a.displayName.slice(0, Math.ceil(a.displayName.length / 2)) + b.displayName.slice(Math.floor(b.displayName.length / 2));
        const filled = Math.round(score / 10);
        const verdict = a.id === b.id ? "Self-love is important 💅" : VERDICTS.find(([min]) => score >= min)![1];

        const embed = new VortexEmbed()
            .setTitle(`💘 ${a.displayName} × ${b.displayName}`)
            .setDescription(`**${shipName}**\n\n\`${"█".repeat(filled)}${"░".repeat(10 - filled)}\` **${score}%**\n${verdict}`)
            .setColor(0xe5487a);

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
