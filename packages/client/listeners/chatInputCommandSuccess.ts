import { Events, Listener, type ChatInputCommandSuccessPayload } from "@sapphire/framework";
import { DBManager } from "../lib/database";

// Logs every successful slash command for the dashboard's Command log and stats.
// (Prefix commands are logged in messageCommandSuccess.ts.)
export class ChatInputCommandSuccessListener extends Listener<typeof Events.ChatInputCommandSuccess> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.ChatInputCommandSuccess });
    }

    public async run({ interaction }: ChatInputCommandSuccessPayload) {
        const parameters = interaction.options.data.map((option) => `${option.name}:${option.value}`).join(" ");

        await DBManager.logCommand({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            command: interaction.commandName,
            parameters,
            slash: true
        });
    }
}
