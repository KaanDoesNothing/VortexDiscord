import {Events, Listener, type MessageCommandSuccessPayload} from "@sapphire/framework";
import { Database } from "../lib/database";

export class MessageCommandSuccess extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.MessageCommandSuccess
        });
    }

    public async run(event: MessageCommandSuccessPayload) {
        await Database.CommandLog.create({
            server: event.message.guildId,
            user: event.message.author.id,
            command: event.command.applicationCommandRegistry.commandName,
            parameters: event.parameters,
            slash: false
        });
    }
}