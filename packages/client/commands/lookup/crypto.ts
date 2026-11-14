import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface SearchResult { coins: { id: string; name: string; symbol: string; market_cap_rank: number | null }[] }
interface Market { name: string; symbol: string; image: string; current_price: number; price_change_percentage_24h: number | null; market_cap: number; market_cap_rank: number | null; high_24h: number; low_24h: number; total_volume: number }

const money = (n: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);
const compact = (n: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(n);

// /crypto <coin> [currency]: live price and 24h stats (CoinGecko public API).
export class CryptoCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["coin", "price"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("crypto")
        .setDescription("Live price and 24h change for a cryptocurrency")
        .addStringOption((o) => o.setName("coin").setDescription("Name or symbol, e.g. bitcoin or ETH").setMaxLength(50).setRequired(true))
        .addStringOption((o) => o.setName("currency").setDescription("Show prices in").addChoices(
            { name: "US Dollar", value: "usd" }, { name: "Euro", value: "eur" }, { name: "British Pound", value: "gbp" },
            { name: "Japanese Yen", value: "jpy" }, { name: "Turkish Lira", value: "try" }, { name: "Indian Rupee", value: "inr" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const query = ctx.options.getString("coin", true).trim();
        const currency = ctx.options.getString("currency") ?? "usd";
        await ctx.deferReply();

        try {
            // Search matches names and symbols; the top result is usually the right coin.
            const search = await getJson<SearchResult>(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, { cacheMs: 3_600_000 });
            const coin = search.coins.find((c) => c.symbol.toLowerCase() === query.toLowerCase()) ?? search.coins[0];
            if (!coin) return ctx.editReply(`Couldn't find a coin called "${query}".`);

            const [m] = await getJson<Market[]>(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coin.id}`, { cacheMs: 60_000 });
            if (!m) return ctx.editReply("No market data for that coin.");

            const cur = currency.toUpperCase();
            const change = m.price_change_percentage_24h ?? 0;
            const embed = new VortexEmbed()
                .setTitle(`${m.name} (${m.symbol.toUpperCase()})`)
                .setURL(`https://www.coingecko.com/en/coins/${coin.id}`)
                .setThumbnail(m.image)
                .setDescription(`## ${money(m.current_price, cur)}\n${change >= 0 ? "📈" : "📉"} **${change >= 0 ? "+" : ""}${change.toFixed(2)}%** in 24h`)
                .setColor(change >= 0 ? 0x30a46c : 0xe5484d)
                .addField("24h high", money(m.high_24h, cur), true)
                .addField("24h low", money(m.low_24h, cur), true)
                .addField("Market cap", `${compact(m.market_cap, cur)}${m.market_cap_rank ? ` (#${m.market_cap_rank})` : ""}`, true)
                .addField("24h volume", compact(m.total_volume, cur), true)
                .setFooter({ text: "Data: CoinGecko · not financial advice" });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
