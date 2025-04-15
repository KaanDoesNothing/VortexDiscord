import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { DBManager } from "../../lib/database";

export class CommandCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["Administrator"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("command")
        .setDescription("Enable or disable commands")
        .addStringOption((arg) => arg.setName("command").setDescription("Command").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const commandName = ctx.options.getString("command")!;

        if(commandName === "command") return ctx.reply({content: "Whoops."});

        if(this.container.stores.get("commands").filter(command => command.name === commandName).size < 1) return ctx.reply({content: "Command doesn't exist"});

        const guildData = await DBManager.getGuild(ctx.guild!.id);
        if(guildData.commands?.disabled.includes(commandName)) {
            await guildData.updateOne({$pull: {"commands.disabled": commandName}});

            return ctx.reply({content: "Command has been enabled."});
        }else {
            guildData.commands?.disabled.push(commandName);

            await guildData.save();

            return ctx.reply({content: "Command has been disabled."});
        }
    }
}