import { Command } from "@sapphire/framework";
import { capitalizeFirstLetter } from "@sapphire/utilities";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { DBManager } from "../../lib/database";
import { linkButtons } from "../../lib/links";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /help [command]: all commands grouped by category, or details for one command.
// Commands disabled on this server (via the dashboard or /command) are hidden.
export class HelpCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("help")
        .setDescription("List every command, or get details and usage for one")
        .addStringOption((option) => option.setName("command").setDescription("A command name to get details for, e.g. ban"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const store = this.container.stores.get("commands");
        const config = ctx.guildId ? await DBManager.getGuildConfig(ctx.guildId) : null;
        const prefix = config?.prefix ?? "->";
        const disabled = new Set(config?.disabledCommands ?? []);

        const query = ctx.options.getString("command")?.toLowerCase();
        if (query) {
            // Look up by name or alias.
            const command = (store.get(query) ?? store.aliases.get(query)) as VortexCommand | undefined;
            if (!command?.applicationCommandData) return ctx.reply({ content: `There's no command called \`${query}\`.`, flags: MessageFlags.Ephemeral });

            const embed = new VortexEmbed()
                .setTitle(`Help: ${command.name}`)
                .setDescription(command.applicationCommandData.description)
                .addField("Usage", `/${command.usage().slice(1, -1)}\n${prefix}${command.usage().slice(1, -1)}`.replace(/^/gm, "`").replace(/$/gm, "`"))
                .addField("Category", capitalizeFirstLetter(command.category ?? "general"), true)
                .addField("Aliases", command.aliases.length ? command.aliases.join(", ") : "None", true);

            if (disabled.has(command.name)) embed.setFooter({ text: "This command is disabled on this server." });

            return ctx.reply({ embeds: [embed] });
        }

        // Group enabled commands by category, alphabetically.
        const categories = new Map<string, string[]>();
        for (const command of store.values()) {
            if (disabled.has(command.name)) continue;
            const category = capitalizeFirstLetter(command.category ?? "general");
            categories.set(category, [...(categories.get(category) ?? []), command.name]);
        }

        const embed = new VortexEmbed()
            .setTitle("Commands")
            .setDescription(`Use \`/command\` or \`${prefix}command\`. Details: \`/help <command>\``)
            .setFooter({ text: `${store.size - disabled.size} commands` });

        for (const [category, names] of [...categories.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            embed.addField(category, names.sort().map((n) => `\`${n}\``).join(" "));
        }

        // Invite / dashboard / support links, so people who like the bot can bring it to their own server.
        return ctx.reply({ embeds: [embed], components: linkButtons(ctx.client, ["invite", "dashboard", "support"], ctx.guildId ?? undefined) });
    }
}
