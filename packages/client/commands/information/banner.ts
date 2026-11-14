import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /banner [user]: someone's profile banner (or their accent color if they don't have one).
export class BannerCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Show someone's profile banner")
        .addUserOption((o) => o.setName("user").setDescription("Whose banner (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        // Banners aren't included in cached users; force a fetch.
        const user = await (ctx.options.getUser("user") ?? ctx.user).fetch(true);
        const banner = user.bannerURL({ size: 1024 });

        if (!banner) {
            return ctx.reply({
                embeds: [new VortexEmbed().setTitle(`${user.displayName} has no banner`).setDescription(user.hexAccentColor ? `Their profile color is \`${user.hexAccentColor}\`.` : null).setColor(user.accentColor ?? null)]
            });
        }

        return ctx.reply({ embeds: [new VortexEmbed().setTitle(`${user.displayName}'s banner`).setURL(banner).setImage(banner)] });
    }
}
