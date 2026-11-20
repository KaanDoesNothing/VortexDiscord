import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { linkButtons } from "../../lib/links";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /invite: link to add the bot to another server, plus the dashboard and support links.
export class InviteCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Add the bot to your own server");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const embed = new VortexEmbed()
            .setTitle(`Add ${ctx.client.user.username} to your server`)
            .setDescription([
                "One bot for your whole server, set up in minutes from the dashboard:",
                "🛡️ Auto-mod, anti-raid, verification, cases and logs",
                "📈 XP leveling with role rewards and rank cards",
                "💰 Economy with a shop, games and your own currency",
                "🎫 Tickets, polls, giveaways, suggestions, reaction roles",
                "🎵 Music, social feeds, temp voice, stats channels and more"
            ].join("\n"))
            .setThumbnail(ctx.client.user.displayAvatarURL());

        return ctx.reply({ embeds: [embed], components: linkButtons(ctx.client, ["invite", "dashboard", "support"]) });
    }
}
