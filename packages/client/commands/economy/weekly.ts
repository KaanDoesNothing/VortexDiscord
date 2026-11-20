import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { ECONOMY, economyFor } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /weekly: a bigger reward once a week.
export class WeeklyCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("weekly")
        .setDescription("Claim a big coin reward once a week");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        const claim = await eco.claimCooldown(ctx.user.id, "weekly", ECONOMY.weeklyCooldownMs);
        if (!claim.ok) return ctx.reply({ content: `⏳ Your weekly reward is ready ${time(claim.readyAt, "R")}.`, flags: MessageFlags.Ephemeral });

        const { reward } = eco.config.weekly;
        const balance = await eco.adjust(ctx.user.id, reward);
        return ctx.reply({ content: `🎁 You claimed your weekly ${eco.format(reward)}! Wallet: ${eco.format(balance ?? 0)}` });
    }
}
