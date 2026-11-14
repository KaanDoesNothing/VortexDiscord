import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Geo { results?: { name: string; country?: string; timezone: string }[] }

// /time <place>: the current local time anywhere. Accepts a city ("Tokyo") or a time zone ("Europe/Paris").
export class TimeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["timezone", "tz"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("time")
        .setDescription("What time is it in another city or time zone?")
        .addStringOption((o) => o.setName("place").setDescription("A city (Tokyo) or time zone (Europe/Paris)").setMaxLength(100).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const place = ctx.options.getString("place", true).trim();
        await ctx.deferReply();

        try {
            // A valid IANA zone name works directly; otherwise geocode the city to find its zone.
            let zone = Intl.supportedValuesOf("timeZone").find((z) => z.toLowerCase() === place.toLowerCase().replace(/ /g, "_"));
            let label = zone ?? place;

            if (!zone) {
                const geo = await getJson<Geo>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`, { cacheMs: 86_400_000 });
                const loc = geo.results?.[0];
                if (!loc) return ctx.editReply(`Couldn't find "${place}". Try a city name or a zone like \`Europe/Paris\`.`);
                zone = loc.timezone;
                label = `${loc.name}${loc.country ? `, ${loc.country}` : ""}`;
            }

            const now = new Date();
            const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: zone, ...opts }).format(now);
            const offset = fmt({ timeZoneName: "longOffset" }).split(" ").pop();

            const embed = new VortexEmbed()
                .setTitle(`🕒 ${label}`)
                .setDescription(`## ${fmt({ hour: "2-digit", minute: "2-digit", hour12: false })}\n${fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" })}`)
                .setFooter({ text: `${zone} · ${offset}` });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
