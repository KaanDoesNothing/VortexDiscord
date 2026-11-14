import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { ECONOMY, getCurrency, pick, randomInt } from "../../lib/economy";
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
        const { min, max, chance, cooldownMs } = ECONOMY.beg;
        const currency = await getCurrency(ctx.guildId);

        const claim = await Economy.claimCooldown(ctx.user.id, "beg", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `🙈 People are avoiding you. Try again ${time(claim.readyAt, "R")}.`, ephemeral: true });

        if (Math.random() > chance) return ctx.reply({ content: `🥺 ${pick(REJECTIONS)}` });

        const amount = randomInt(min, max);
        await DBManager.adjustBalance(ctx.user.id, amount);
        return ctx.reply({ content: `🙏 ${pick(GENEROUS)} gave you ${currency.format(amount)}.` });
    }
}
