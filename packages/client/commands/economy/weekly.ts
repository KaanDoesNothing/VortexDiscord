import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /weekly: a bigger reward once a week.
export class WeeklyCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("weekly")
        .setDescription("Claim a big coin reward once a week");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const currency = await getCurrency(ctx.guildId);
        const claim = await Economy.claimCooldown(ctx.user.id, "weekly", ECONOMY.weekly.cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `⏳ Your weekly reward is ready ${time(claim.readyAt, "R")}.`, ephemeral: true });

        const balance = await DBManager.adjustBalance(ctx.user.id, ECONOMY.weekly.reward);
        return ctx.reply({ content: `🎁 You claimed your weekly ${currency.format(ECONOMY.weekly.reward)}! Wallet: ${currency.format(balance ?? 0)}` });
    }
}
