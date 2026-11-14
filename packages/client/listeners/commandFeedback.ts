import { Events, Listener, type ChatInputCommandDeniedPayload, type ChatInputCommandErrorPayload, type MessageCommandDeniedPayload, type MessageCommandErrorPayload, type UserError } from "@sapphire/framework";

// Tells users why a command didn't run. Without these, a missing permission, a disabled
// command or a crash just leaves the user with "The application did not respond".

const ERROR_MESSAGE = "Something went wrong running that command. Please try again later.";

// Denied: a precondition failed (missing permissions, disabled command, wrong channel, cooldown...).
export class ChatInputDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "VortexChatInputCommandDenied", event: Events.ChatInputCommandDenied });
    }

    public async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
        // Preconditions can mark an error as silent.
        if (Reflect.get(Object(error.context), "silent")) return;

        const content = error.message;
        if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
        return interaction.reply({ content, ephemeral: true });
    }
}

export class MessageDeniedListener extends Listener<typeof Events.MessageCommandDenied> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "VortexMessageCommandDenied", event: Events.MessageCommandDenied });
    }

    public async run(error: UserError, { message }: MessageCommandDeniedPayload) {
        if (Reflect.get(Object(error.context), "silent")) return;
        return message.reply({ content: error.message, allowedMentions: { repliedUser: false } }).catch(() => null);
    }
}

// Error: the command itself threw. Log it, then tell the user.
export class ChatInputErrorListener extends Listener<typeof Events.ChatInputCommandError> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "VortexChatInputCommandError", event: Events.ChatInputCommandError });
    }

    public async run(error: unknown, { interaction, command }: ChatInputCommandErrorPayload) {
        this.container.logger.error(`/${command.name} failed:`, error);

        const reply = interaction.deferred || interaction.replied
            ? interaction.editReply({ content: ERROR_MESSAGE })
            : interaction.reply({ content: ERROR_MESSAGE, ephemeral: true });
        await reply.catch(() => null);
    }
}

export class MessageErrorListener extends Listener<typeof Events.MessageCommandError> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "VortexMessageCommandError", event: Events.MessageCommandError });
    }

    public async run(error: unknown, { message, command }: MessageCommandErrorPayload) {
        this.container.logger.error(`${command.name} (prefix) failed:`, error);
        await message.reply({ content: ERROR_MESSAGE, allowedMentions: { repliedUser: false } }).catch(() => null);
    }
}
