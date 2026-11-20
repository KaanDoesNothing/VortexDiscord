import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { economyFor, pick, randomInt } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

const GENEROUS = ["A kind stranger", "A passing millionaire", "Your grandma", "A friendly ghost", "A confused tourist", "The server owner"];
const REJECTIONS = [
    "Everyone pretended not to see you.",
    "A pigeon stole the only coin someone threw.",
    "\"Get a job!\" someone shouted. Rude.",
    "You held out your hat. It started raining.",
    "Someone gave you advice instead of money."
];

// /beg: small, unreliable income every 5 minutes.
export class BegCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("beg")
        .setDescription("Beg strangers for a few coins (might not work)");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        const { min, max, cooldownMinutes } = eco.config.beg;
        const chance = eco.config.beg.chance / 100;
        const cooldownMs = cooldownMinutes * 60_000;

        const claim = await eco.claimCooldown(ctx.user.id, "beg", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `🙈 People are avoiding you. Try again ${time(claim.readyAt, "R")}.`, flags: MessageFlags.Ephemeral });

        if (Math.random() > chance) return ctx.reply({ content: `🥺 ${pick(REJECTIONS)}` });

        const amount = randomInt(min, max);
        await eco.adjust(ctx.user.id, amount);
        return ctx.reply({ content: `🙏 ${pick(GENEROUS)} gave you ${eco.format(amount)}.` });
    }
}
