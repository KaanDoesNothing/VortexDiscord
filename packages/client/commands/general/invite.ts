import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, OAuth2Scopes, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Permissions the bot asks for when invited: everything its features use, instead of Administrator.
const PERMISSIONS = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers
];

// /invite: link to add the bot to another server, plus the dashboard link.
export class InviteCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Add the bot to your own server");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const invite = ctx.client.generateInvite({ scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands], permissions: PERMISSIONS });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setLabel("Add to server").setStyle(ButtonStyle.Link).setURL(invite)
        );
        const dashboard = Bun.env.FRONTEND_URL;
        if (dashboard?.startsWith("https://")) row.addComponents(new ButtonBuilder().setLabel("Dashboard").setStyle(ButtonStyle.Link).setURL(`${dashboard.replace(/\/$/, "")}/dashboard`));

        const embed = new VortexEmbed()
            .setTitle(`Add ${ctx.client.user.username} to your server`)
            .setDescription("Moderation, economy, leveling, giveaways, tickets and 100+ commands, all configurable from the dashboard.")
            .setThumbnail(ctx.client.user.displayAvatarURL());

        return ctx.reply({ embeds: [embed], components: [row] });
    }
}
