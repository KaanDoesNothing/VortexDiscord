import { Command } from "@sapphire/framework";
import { PermissionFlagsBits, SlashCommandBuilder, time, type Role } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Permissions worth highlighting (the full list is long and mostly noise).
const KEY_PERMISSIONS: [bigint, string][] = [
    [PermissionFlagsBits.Administrator, "Administrator"], [PermissionFlagsBits.ManageGuild, "Manage Server"],
    [PermissionFlagsBits.ManageRoles, "Manage Roles"], [PermissionFlagsBits.ManageChannels, "Manage Channels"],
    [PermissionFlagsBits.BanMembers, "Ban"], [PermissionFlagsBits.KickMembers, "Kick"],
    [PermissionFlagsBits.ModerateMembers, "Timeout"], [PermissionFlagsBits.ManageMessages, "Manage Messages"],
    [PermissionFlagsBits.MentionEveryone, "Mention @everyone"]
];

// /roleinfo <role>: details about a role.
export class RoleInfoCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["role"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("Details about a role: color, members, key permissions")
        .addRoleOption((o) => o.setName("role").setDescription("Which role").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const role = ctx.options.getRole("role", true) as Role;
        const perms = KEY_PERMISSIONS.filter(([flag]) => role.permissions.has(flag)).map(([, name]) => name);

        const embed = new VortexEmbed()
            .setTitle(role.name)
            .setColor(role.color || 0x8e8c99)
            .addField("Members", role.members.size.toLocaleString(), true)
            .addField("Color", role.color ? role.hexColor : "None", true)
            .addField("Position", `${role.position} of ${ctx.guild!.roles.cache.size - 1}`, true)
            .addField("Mentionable", role.mentionable ? "Yes" : "No", true)
            .addField("Shown separately", role.hoist ? "Yes" : "No", true)
            .addField("Created", time(role.createdAt, "R"), true)
            .addField("Key permissions", perms.join(", ") || "None")
            .setFooter({ text: `ID: ${role.id}${role.managed ? " · managed by an integration" : ""}` });

        if (role.iconURL()) embed.setThumbnail(role.iconURL());
        return ctx.reply({ embeds: [embed] });
    }
}
