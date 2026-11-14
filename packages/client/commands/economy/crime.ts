import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { ECONOMY, getCurrency, pick, randomInt } from "../../lib/economy";
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
        const { min, max, chance, fineMin, fineMax, cooldownMs } = ECONOMY.crime;
        const currency = await getCurrency(ctx.guildId);

        const claim = await Economy.claimCooldown(ctx.user.id, "crime", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `🚔 Lay low for a while. You can try again ${time(claim.readyAt, "R")}.`, ephemeral: true });

        if (Math.random() < chance) {
            const amount = randomInt(min, max);
            await DBManager.adjustBalance(ctx.user.id, amount);
            return ctx.reply({ content: `🦹 ${pick(SUCCESS).replace("{amount}", currency.format(amount))}` });
        }

        const taken = await Economy.fine(ctx.user.id, randomInt(fineMin, fineMax));
        return ctx.reply({ content: `🚨 ${pick(CAUGHT).replace("{amount}", currency.format(taken))}` });
    }
}
