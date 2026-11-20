import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, type ModLogType } from "../../lib/database";
import { MOD_LABELS } from "../../lib/modlog";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

// /case view|reason|delete <id>: look up a moderation case (numbers are shown in the mod log),
// fix its reason, or delete it (deleting a warning takes it off the member's count).
export class CaseCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["cases"], requiredUserPermissions: ["ModerateMembers"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("case")
        .setDescription("View, edit or delete a moderation case")
        .addSubcommand((s) => s.setName("view").setDescription("Show a case")
            .addIntegerOption((o) => o.setName("id").setDescription("Case number").setMinValue(1).setRequired(true)))
        .addSubcommand((s) => s.setName("reason").setDescription("Change a case's reason")
            .addIntegerOption((o) => o.setName("id").setDescription("Case number").setMinValue(1).setRequired(true))
            .addStringOption((o) => o.setName("reason").setDescription("The new reason").setMaxLength(400).setRequired(true)))
        .addSubcommand((s) => s.setName("delete").setDescription("Delete a case (e.g. a warning given by mistake)")
            .addIntegerOption((o) => o.setName("id").setDescription("Case number").setMinValue(1).setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const id = ctx.options.getInteger("id", true);
        const sub = ctx.options.getSubcommand();

        const entry = await DBManager.getCase(guildId, id);
        if (!entry) return ctx.reply(fail(`There's no case #${id} on this server.`));

        if (sub === "reason") {
            await DBManager.updateCaseReason(guildId, id, ctx.options.getString("reason", true));
            return ctx.reply(ok(`Updated the reason for case #${id}.`));
        }
        if (sub === "delete") {
            await DBManager.deleteCase(guildId, id);
            return ctx.reply(ok(`Deleted case #${id}.${entry.type === "warn" ? " It no longer counts toward warning punishments." : ""}`));
        }

        const meta = MOD_LABELS[entry.type as ModLogType] ?? { label: entry.type, color: 0x8e8c99 };
        const embed = new VortexEmbed().setColor(meta.color).setTitle(`${meta.label} · Case #${entry.id}`)
            .addField("User", entry.targetId ? `<@${entry.targetId}> (${entry.targetId})` : "Unknown", true)
            .addField("Moderator", entry.moderatorId ? `<@${entry.moderatorId}>` : "Unknown", true)
            .addField("When", time(entry.createdAt, "f"), true)
            .addField("Reason", entry.reason.slice(0, 1024));
        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
