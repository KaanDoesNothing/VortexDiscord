import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { ECONOMY, getCurrency, pick, randomInt } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// Random shift descriptions; {pay} is replaced with the amount earned.
const JOBS = [
    "You fixed a bug in production at 3 AM and earned {pay}.",
    "You delivered pizzas across town and earned {pay} in tips.",
    "You moderated a very chaotic Discord server and earned {pay}.",
    "You walked seven dogs at once and earned {pay}.",
    "You streamed for six hours to three viewers and earned {pay} in donations.",
    "You baked 200 cookies for a bake sale and earned {pay}.",
    "You taught a class of very confused students and earned {pay}.",
    "You fixed your neighbour's Wi-Fi (it was unplugged) and earned {pay}.",
    "You painted a mural downtown and earned {pay}.",
    "You worked a double shift at the café and earned {pay}.",
    "You sold handmade bracelets at the market and earned {pay}.",
    "You won a hackathon (honourable mention) and earned {pay}."
];

// /work: earn a random amount once an hour.
export class WorkCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work a shift for some coins (once an hour)");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { min, max, cooldownMs } = ECONOMY.work;
        const currency = await getCurrency(ctx.guildId);

        const claim = await Economy.claimCooldown(ctx.user.id, "work", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `😮‍💨 You're tired. You can work again ${time(claim.readyAt, "R")}.`, ephemeral: true });

        const pay = randomInt(min, max);
        await DBManager.adjustBalance(ctx.user.id, pay);

        return ctx.reply({ content: `💼 ${pick(JOBS).replace("{pay}", currency.format(pay))}` });
    }
}
