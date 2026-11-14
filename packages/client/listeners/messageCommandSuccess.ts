import { Events, Listener, type MessageCommandSuccessPayload } from "@sapphire/framework";
import { DBManager } from "../lib/database";

// Logs every successful prefix command for the dashboard's Command log and stats.
export class MessageCommandSuccessListener extends Listener<typeof Events.MessageCommandSuccess> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.MessageCommandSuccess });
    }

    public async run({ message, command, parameters }: MessageCommandSuccessPayload) {
        await DBManager.logCommand({
            guildId: message.guildId,
            userId: message.author.id,
            command: command.name,
            parameters
        });
    }
}
