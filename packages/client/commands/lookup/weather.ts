import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// WMO weather codes used by Open-Meteo → description + emoji.
const CODES: Record<number, [string, string]> = {
    0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"], 48: ["Freezing fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"], 67: ["Heavy freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
    80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent rain showers", "⛈️"],
    85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Thunderstorm with heavy hail", "⛈️"]
};

interface Geo { results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone: string }[] }
interface Forecast {
    current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; is_day: number };
    daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max: number[] };
}

// /weather <place> [units]: current conditions and a 3-day forecast (Open-Meteo, no API key).
export class WeatherCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Current weather and a 3-day forecast for any city")
        .addStringOption((o) => o.setName("place").setDescription("City name, e.g. Amsterdam").setMaxLength(100).setRequired(true))
        .addStringOption((o) => o.setName("units").setDescription("Temperature units").addChoices({ name: "Celsius", value: "c" }, { name: "Fahrenheit", value: "f" }));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const place = ctx.options.getString("place", true);
        const fahrenheit = ctx.options.getString("units") === "f";
        await ctx.deferReply();

        try {
            const geo = await getJson<Geo>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`, { cacheMs: 86_400_000 });
            const loc = geo.results?.[0];
            if (!loc) return ctx.editReply(`Couldn't find a place called "${place}".`);

            const unit = fahrenheit ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "";
            const f = await getJson<Forecast>(
                `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=${encodeURIComponent(loc.timezone)}${unit}` +
                "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
                "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=3",
                { cacheMs: 10 * 60_000 }
            );

            const t = fahrenheit ? "°F" : "°C";
            const [desc, emoji] = CODES[f.current.weather_code] ?? ["Unknown", "🌡️"];
            const days = f.daily.time.map((day, i) => {
                const [d, e] = CODES[f.daily.weather_code[i]!] ?? ["", "🌡️"];
                const label = i === 0 ? "Today" : new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
                return `${e} **${label}**: ${Math.round(f.daily.temperature_2m_min[i]!)}${t} – ${Math.round(f.daily.temperature_2m_max[i]!)}${t} · ${d} · 💧 ${f.daily.precipitation_probability_max[i] ?? 0}%`;
            });

            const embed = new VortexEmbed()
                .setTitle(`${emoji} ${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ""}${loc.country ? `, ${loc.country}` : ""}`)
                .setDescription(`**${Math.round(f.current.temperature_2m)}${t}** · ${desc}\nFeels like ${Math.round(f.current.apparent_temperature)}${t}`)
                .addField("Humidity", `${f.current.relative_humidity_2m}%`, true)
                .addField("Wind", `${Math.round(f.current.wind_speed_10m)} ${fahrenheit ? "mph" : "km/h"}`, true)
                .addField("Forecast", days.join("\n"))
                .setFooter({ text: "Data: Open-Meteo" });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
