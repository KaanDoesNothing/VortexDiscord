import {Command, Events, Listener, type MessageCommandSuccessPayload} from "@sapphire/framework";
import { Database } from "../lib/database";
import { ApplicationCommandOptionType, type Interaction } from "discord.js";

export class MessageCommandSuccess extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.InteractionCreate
        });
    }

    public async run(event: Interaction) {
        if(!event.isCommand()) return;
        const parameters = event.options.data.map(option => `${option.name}:${option.value}`).join(" ");
        
        await Database.CommandLog.create({
            server: event.guildId!,
            user: event.user.id,
            command: event.commandName,
            parameters: parameters,
            slash: true
        });
    }
}