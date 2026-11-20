import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { economyFor, pick, randomInt } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

const SUCCESS = [
    "You hacked a vending machine and walked away with {amount}.",
    "You sold fake concert tickets and made {amount}.",
    "You won an underground rubber-duck race and pocketed {amount}.",
    "You found a wallet and \"forgot\" to return {amount}.",
    "You ran a very suspicious lemonade stand and made {amount}."
];
const CAUGHT = [
    "The police caught you red-handed. You paid a fine of {amount}.",
    "Your getaway car was a bicycle. You were fined {amount}.",
    "You tripped over a cat during the escape. Fine: {amount}.",
    "The security guard was your mom. She took {amount}."
];

// /crime: high risk, high reward, every 2 hours.
export class CrimeCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("crime")
        .setDescription("Commit a (harmless) crime: big payout, or a fine if you get caught");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        const { min, max, fineMin, fineMax, cooldownMinutes } = eco.config.crime;
        const chance = eco.config.crime.chance / 100;
        const cooldownMs = cooldownMinutes * 60_000;

        const claim = await eco.claimCooldown(ctx.user.id, "crime", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `🚔 Lay low for a while. You can try again ${time(claim.readyAt, "R")}.`, flags: MessageFlags.Ephemeral });

        if (Math.random() < chance) {
            const amount = randomInt(min, max);
            await eco.adjust(ctx.user.id, amount);
            return ctx.reply({ content: `🦹 ${pick(SUCCESS).replace("{amount}", eco.format(amount))}` });
        }

        const taken = await eco.fine(ctx.user.id, randomInt(fineMin, fineMax));
        return ctx.reply({ content: `🚨 ${pick(CAUGHT).replace("{amount}", eco.format(taken))}` });
    }
}
