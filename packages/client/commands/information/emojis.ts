import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /emojis: every custom emoji on the server.
export class EmojisCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["emotes"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("emojis")
        .setDescription("Show all of this server's custom emojis");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const emojis = ctx.guild!.emojis.cache;
        const embed = new VortexEmbed().setTitle(`Emojis in ${ctx.guild!.name}`);

        if (!emojis.size) return ctx.reply({ embeds: [embed.setDescription("This server has no custom emojis.")] });

        const still = emojis.filter((e) => !e.animated).map((e) => `${e}`);
        const animated = emojis.filter((e) => e.animated).map((e) => `${e}`);

        // Field values max out at 1024 characters; show as many as fit.
        const fit = (list: string[]) => {
            let out = "";
            for (const e of list) {
                if (out.length + e.length + 1 > 1000) return `${out}…`;
                out += `${e} `;
            }
            return out;
        };

        if (still.length) embed.addField(`Static (${still.length})`, fit(still));
        if (animated.length) embed.addField(`Animated (${animated.length})`, fit(animated));
        return ctx.reply({ embeds: [embed] });
    }
}
