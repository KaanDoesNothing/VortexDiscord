import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency, randomInt } from "../../lib/economy";
import { HIGHLOW_MAX, highLowOdds } from "../../lib/games";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /highlow <bet>: a number from 1-100 is shown; guess whether the next one is higher or lower.
// Each button shows its payout, which depends on the odds (risky guesses pay more).
export class HighLowCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["hl"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("highlow")
        .setDescription("Guess if the next number is higher or lower: riskier guesses pay more")
        .addIntegerOption((o) => o.setName("bet").setDescription("How much to bet").setMinValue(1).setMaxValue(ECONOMY.maxBet).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const bet = ctx.options.getInteger("bet", true);
        const currency = await getCurrency(ctx.guildId);

        // Take the bet up front.
        if (await DBManager.adjustBalance(ctx.user.id, -bet, bet) === null) {
            return ctx.reply({ content: `You don't have ${currency.format(bet)} to bet.`, ephemeral: true });
        }

        const shown = randomInt(1, HIGHLOW_MAX);
        const next = randomInt(1, HIGHLOW_MAX);
        const odds = highLowOdds(shown);

        const embed = new VortexEmbed()
            .setTitle(`🔢 Higher or lower? · bet ${bet.toLocaleString()}`)
            .setDescription(`The number is **${shown}** (1-${HIGHLOW_MAX}).\nWill the next one be higher or lower?`);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("higher").setLabel(`Higher (${odds.higher}x)`).setEmoji("⬆️").setStyle(ButtonStyle.Primary).setDisabled(!odds.higher),
            new ButtonBuilder().setCustomId("lower").setLabel(`Lower (${odds.lower}x)`).setEmoji("⬇️").setStyle(ButtonStyle.Primary).setDisabled(!odds.lower)
        );

        const message = await replyAndFetch(ctx, { embeds: [embed], components: [row] });

        const choice = await message.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === ctx.user.id,
            time: 30_000
        }).catch(() => null);

        // No answer: refund (nothing was decided yet).
        if (!choice) {
            await DBManager.adjustBalance(ctx.user.id, bet);
            return message.edit({ embeds: [embed.setDescription(`⏱️ Timed out, your ${currency.format(bet)} was refunded.`)], components: [] }).catch(() => null);
        }

        const guess = choice.customId as "higher" | "lower";
        const correct = guess === "higher" ? next > shown : next < shown;
        const payout = next === shown ? bet : correct ? Math.floor(bet * odds[guess]) : 0;
        const balance = payout > 0 ? await DBManager.adjustBalance(ctx.user.id, payout) : (await DBManager.getUser(ctx.user.id)).balance;

        const outcome = next === shown
            ? "🤝 Same number! Your bet is refunded."
            : correct ? `✅ Correct! You won ${currency.format(payout)}.` : `❌ Wrong! You lost ${currency.format(bet)}.`;

        return choice.update({
            embeds: [embed
                .setDescription(`It was **${shown}** → **${next}**. You guessed **${guess}**.\n${outcome}\nWallet: ${currency.format(balance ?? 0)}`)
                .setColor(payout > bet ? 0x30a46c : payout === bet ? 0x8e8c99 : 0xe5484d)],
            components: []
        });
    }
}
