import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { DBManager } from "../../lib/database";
import { VortexCommand } from "../../lib/structures/command";

// /command <name>: toggles a command on/off for this server (same as the dashboard's Commands page).
export class CommandCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ManageGuild"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("command")
        .setDescription("Turn a command on or off for this server")
        .addStringOption((arg) => arg.setName("command").setDescription("The command's name or alias").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const query = ctx.options.getString("command", true).toLowerCase().replace(/^\//, "");
        const store = this.container.stores.get("commands");
        const command = store.get(query) ?? store.aliases.get(query);

        if (!command) return ctx.reply({ content: `There's no command called \`${query}\`.`, flags: MessageFlags.Ephemeral });
        // Disabling this one would make it impossible to turn anything back on from Discord.
        if (command.name === this.name) return ctx.reply({ content: "This command can't be disabled.", flags: MessageFlags.Ephemeral });

        const disabled = await DBManager.toggleCommand(ctx.guild!.id, command.name);

        return ctx.reply({ content: `\`${command.name}\` is now **${disabled ? "disabled" : "enabled"}** on this server.` });
    }
}
