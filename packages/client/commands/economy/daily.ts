import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /daily: free coins every 24 hours, with a bonus for each day in a row (up to 10).
export class DailyCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim free daily coins; claim every day for a growing streak bonus");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { reward, cooldownMs, streakBonus } = ECONOMY.daily;
        const [result, currency] = await Promise.all([
            DBManager.claimDaily(ctx.user.id, reward, cooldownMs, streakBonus),
            getCurrency(ctx.guildId)
        ]);

        // <t:...:R> shows "in 5 hours" in the user's own timezone.
        if (!result.claimed) {
            return ctx.reply({ content: `⏳ You can claim your daily again ${time(result.nextClaimAt, "R")}. Current streak: 🔥 ${result.streak}`, ephemeral: true });
        }

        const bonus = result.paid - reward;
        return ctx.reply({
            content: `✅ You claimed ${currency.format(result.paid)}${bonus ? ` (includes a ${bonus.toLocaleString()} streak bonus)` : ""}!\n🔥 Streak: **${result.streak}** day${result.streak === 1 ? "" : "s"} · Wallet: ${currency.format(result.balance)}`
        });
    }
}
