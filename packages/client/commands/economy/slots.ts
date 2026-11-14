import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
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
        const currency = await getCurrency(ctx.guildId);
        const { reels, multiplier } = playSlots();
        const payout = Math.floor(bet * multiplier);

        // Net change in one atomic update: lose the bet, gain the payout. Only if they can cover the bet.
        const balance = await DBManager.adjustBalance(ctx.user.id, payout - bet, bet);
        if (balance === null) return ctx.reply({ content: `You don't have ${currency.format(bet)} to bet.`, ephemeral: true });

        const result = multiplier >= 1
            ? `🎉 You won ${currency.format(payout)}! (${multiplier}x)`
            : multiplier > 0 ? `So close: you got ${currency.format(payout)} back.` : `You lost ${currency.format(bet)}.`;

        const embed = new VortexEmbed()
            .setTitle("🎰 Slots")
            .setDescription(`## ${reels.join(" ")}\n${result}`)
            .setFooter({ text: `Three of a kind: ${SLOT_SYMBOLS.map((s) => `${s.emoji} ${s.pays}x`).join(" · ")} · 🍒🍒 1.5x` })
            .addField("Wallet", currency.format(balance));

        if (multiplier >= 1) embed.setColor(0x30a46c);
        return ctx.reply({ embeds: [embed] });
    }
}
