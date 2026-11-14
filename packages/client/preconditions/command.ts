import {AllFlowsPrecondition, Command} from "@sapphire/framework";
import {CommandInteraction, ContextMenuCommandInteraction, Message} from "discord.js";
import { DBManager } from "../lib/database";

export class CommandCheckPrecondition extends AllFlowsPrecondition {
    public constructor(context: AllFlowsPrecondition.LoaderContext, options: AllFlowsPrecondition.Options) {
        super(context, {
            ...options,
            position: 20
        });
    }

    public override async chatInputRun(interaction: CommandInteraction, command: Command)  {
        return await this.check(interaction.guild!.id, interaction.user.id, command);
    }

    public override async messageRun(message: Message, command: Command)  {
        return await this.check(message.guild!.id, message.author.id, command);
    }

    public override contextMenuRun(_interaction: ContextMenuCommandInteraction) {
        return this.ok();
    }

    private async check(server: string, user: string, command: Command) {
        const guildData = await DBManager.getGuild(server);
        if(guildData.commands?.disabled.includes(command.name)) return this.error({message: "Command is disabled."});

        return this.ok();
    }
}