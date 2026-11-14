import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { DBManager } from "../../lib/database";
import { VortexEmbed } from "../../lib/structures/embed";

// /warns <user>: a user's warnings in this server (most recent 25, an embed's field limit).
export class WarningsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("warns")
        .setDescription("List every warning a user has received on this server")
        .addUserOption((arg) => arg.setName("user").setDescription("Whose warnings to show").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const warnings = await DBManager.getModLogs(ctx.guild!.id, user.id, { type: "warn", limit: 25 });

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s warnings`)
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: `${warnings.length}${warnings.length === 25 ? "+" : ""} warning${warnings.length === 1 ? "" : "s"}` });

        if (!warnings.length) embed.setDescription("No warnings. 🎉");

        for (const row of warnings) {
            embed.addField(time(row.createdAt, "f"), row.reason.slice(0, 1000));
        }

        return ctx.reply({ embeds: [embed] });
    }
}
