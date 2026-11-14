import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
import { handValue, isBlackjack, newDeck, playDealer, settleBlackjack, showHand, type BlackjackOutcome, type Card } from "../../lib/games";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const RESULT_TEXT: Record<BlackjackOutcome, string> = {
    blackjack: "🃏 **Blackjack!** You win 1.5x.",
    win: "✅ **You win!**",
    push: "🤝 **Push.** Your bet is returned.",
    lose: "❌ **Dealer wins.**",
    bust: "💥 **Bust!** You went over 21."
};

// /blackjack <bet>: classic blackjack against the dealer, played with Hit / Stand / Double buttons.
// The bet is taken up front and the result paid out at the end, so quitting mid-game can't dodge a loss.
export class BlackjackCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["bj", "21"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play blackjack against the dealer: get closer to 21 without going over")
        .addIntegerOption((o) => o.setName("bet").setDescription("How much to bet").setMinValue(1).setMaxValue(ECONOMY.maxBet).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        let bet = ctx.options.getInteger("bet", true);
        const currency = await getCurrency(ctx.guildId);

        // Take the bet now.
        if (await DBManager.adjustBalance(ctx.user.id, -bet, bet) === null) {
            return ctx.reply({ content: `You don't have ${currency.format(bet)} to bet.`, ephemeral: true });
        }

        const deck = newDeck();
        const player: Card[] = [deck.pop()!, deck.pop()!];
        const dealer: Card[] = [deck.pop()!, deck.pop()!];

        const render = (finished: boolean, footer?: string) => new VortexEmbed()
            .setTitle(`🃏 Blackjack · bet ${bet.toLocaleString()}`)
            .addField(`Your hand (${handValue(player)})`, showHand(player))
            // The dealer's second card stays hidden until the end.
            .addField(`Dealer (${finished ? handValue(dealer) : "?"})`, finished ? showHand(dealer) : `${showHand([dealer[0]!])} \`??\``)
            .setFooter(footer ? { text: footer } : null);

        const buttons = (canDouble: boolean) => new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("stand").setLabel("Stand").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("double").setLabel("Double down").setStyle(ButtonStyle.Success).setDisabled(!canDouble)
        );

        // Ends the game: dealer plays, payout is credited, buttons removed.
        const finish = async () => {
            if (handValue(player) <= 21 && !isBlackjack(player)) playDealer(dealer, deck);
            const { outcome, returnMultiplier } = settleBlackjack(player, dealer);
            const payout = Math.floor(bet * returnMultiplier);
            const balance = payout > 0 ? await DBManager.adjustBalance(ctx.user.id, payout) : (await DBManager.getUser(ctx.user.id)).balance;

            const net = payout - bet;
            const summary = `${RESULT_TEXT[outcome]}\n${net >= 0 ? `+${currency.format(net)}` : `-${currency.format(-net)}`} · Wallet: ${currency.format(balance ?? 0)}`;
            return { embeds: [render(true).setDescription(summary).setColor(net > 0 ? 0x30a46c : net < 0 ? 0xe5484d : 0x8e8c99)], components: [] };
        };

        // A natural blackjack (either side) ends the hand immediately.
        if (isBlackjack(player) || isBlackjack(dealer)) return ctx.reply(await finish());

        const message = await replyAndFetch(ctx, { embeds: [render(false, "Hit to draw a card, Stand to hold, Double to double your bet for one card")], components: [buttons(true)] });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === ctx.user.id,
            time: 60_000
        });

        collector.on("collect", async (i) => {
            if (i.customId === "double") {
                // Doubling needs another `bet` in the wallet.
                if (await DBManager.adjustBalance(ctx.user.id, -bet, bet) === null) {
                    return i.reply({ content: "You don't have enough to double down.", ephemeral: true });
                }
                bet *= 2;
                player.push(deck.pop()!);
                collector.stop("done");
                return i.update(await finish());
            }

            if (i.customId === "hit") {
                player.push(deck.pop()!);
                if (handValue(player) >= 21) {
                    collector.stop("done");
                    return i.update(await finish());
                }
                return i.update({ embeds: [render(false)], components: [buttons(false)] });
            }

            collector.stop("done");
            return i.update(await finish());
        });

        // No answer for a minute: stand automatically so the bet is always settled.
        collector.on("end", async (_c, reason) => {
            if (reason === "done") return;
            await message.edit({ ...(await finish()), content: "⏱️ Timed out: you stood automatically." }).catch(() => null);
        });
    }
}
