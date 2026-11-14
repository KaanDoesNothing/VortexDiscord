import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { DBManager } from "../../lib/database";
import { VortexEmbed } from "../../lib/structures/embed";

// /modlogs <user>: the 10 most recent moderation actions against a user in this server.
export class ModLogsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("modlogs")
        .setDescription("Show the last 10 warns, kicks, bans and deafens for a user")
        .addUserOption((arg) => arg.setName("user").setDescription("Whose moderation history to show").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const logs = await DBManager.getModLogs(ctx.guild!.id, user.id, { limit: 10 });

        const embed = new VortexEmbed().setTitle(`${user.tag}'s mod log`).setThumbnail(user.displayAvatarURL());

        if (!logs.length) embed.setDescription("No moderation actions recorded.");

        for (const row of logs) {
            // <t:...:R> renders as "3 days ago" in each viewer's timezone.
            embed.addField(`${row.type} · ${time(row.createdAt, "R")}`, `${row.reason.slice(0, 900)}${row.moderatorId ? `\nBy <@${row.moderatorId}>` : ""}`);
        }

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
