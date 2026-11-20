import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { economyFor } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /daily: free coins every 24 hours, with a bonus for each day in a row (up to 10).
export class DailyCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim free daily coins; claim every day for a growing streak bonus");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        const { reward } = eco.config.daily;
        const result = await eco.claimDaily(ctx.user.id);

        // <t:...:R> shows "in 5 hours" in the user's own timezone.
        if (!result.claimed) {
            return ctx.reply({ content: `⏳ You can claim your daily again ${time(result.nextClaimAt, "R")}. Current streak: 🔥 ${result.streak}`, flags: MessageFlags.Ephemeral });
        }

        const bonus = result.paid - reward;
        return ctx.reply({
            content: `✅ You claimed ${eco.format(result.paid)}${bonus ? ` (includes a ${bonus.toLocaleString()} streak bonus)` : ""}!\n🔥 Streak: **${result.streak}** day${result.streak === 1 ? "" : "s"} · Wallet: ${eco.format(result.balance)}`
        });
    }
}
