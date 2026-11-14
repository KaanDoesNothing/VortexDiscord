import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { randomInt } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /random [min] [max] [count]: random whole numbers (dice rolls, raffles...).
export class RandomCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["rng", "roll"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("random")
        .setDescription("Get random numbers in a range (default 1-100)")
        .addIntegerOption((o) => o.setName("min").setDescription("Lowest number (default 1)"))
        .addIntegerOption((o) => o.setName("max").setDescription("Highest number (default 100)"))
        .addIntegerOption((o) => o.setName("count").setDescription("How many numbers (default 1)").setMinValue(1).setMaxValue(20));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        let min = ctx.options.getInteger("min") ?? 1;
        let max = ctx.options.getInteger("max") ?? 100;
        const count = ctx.options.getInteger("count") ?? 1;
        if (min > max) [min, max] = [max, min];

        const numbers = Array.from({ length: count }, () => randomInt(min, max));
        return ctx.reply({ content: `🎲 ${min}–${max}: **${numbers.join(", ")}**` });
    }
}
