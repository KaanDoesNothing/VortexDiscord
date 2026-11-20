import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { ECONOMY, economyFor } from "../../lib/economy";
import { playSlots, SLOT_SYMBOLS } from "../../lib/games";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /slots <bet>: spin three reels. Payout table is in lib/games.ts.
export class SlotsCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("slots")
        .setDescription("Spin the slot machine: three of a kind pays up to 250x")
        .addIntegerOption((o) => o.setName("bet").setDescription("How much to bet").setMinValue(1).setMaxValue(ECONOMY.maxBet).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const bet = ctx.options.getInteger("bet", true);
        const eco = await economyFor(ctx.guildId);
        // The server can turn gambling off or cap bets (Dashboard → Economy).
        const betProblem = eco.checkBet(bet);
        if (betProblem) return ctx.reply({ content: betProblem, flags: MessageFlags.Ephemeral });
        const { reels, multiplier } = playSlots();
        const payout = Math.floor(bet * multiplier);

        // Net change in one atomic update: lose the bet, gain the payout. Only if they can cover the bet.
        const balance = await eco.adjust(ctx.user.id, payout - bet, bet);
        if (balance === null) return ctx.reply({ content: `You don't have ${eco.format(bet)} to bet.`, flags: MessageFlags.Ephemeral });

        const result = multiplier >= 1
            ? `🎉 You won ${eco.format(payout)}! (${multiplier}x)`
            : multiplier > 0 ? `So close: you got ${eco.format(payout)} back.` : `You lost ${eco.format(bet)}.`;

        const embed = new VortexEmbed()
            .setTitle("🎰 Slots")
            .setDescription(`## ${reels.join(" ")}\n${result}`)
            .setFooter({ text: `Three of a kind: ${SLOT_SYMBOLS.map((s) => `${s.emoji} ${s.pays}x`).join(" · ")} · 🍒🍒 1.5x` })
            .addField("Wallet", eco.format(balance));

        if (multiplier >= 1) embed.setColor(0x30a46c);
        return ctx.reply({ embeds: [embed] });
    }
}
