import { Args, Command } from "@sapphire/framework";
import {
    ApplicationCommandOptionType,
    type APIApplicationCommandBasicOption,
    type APIApplicationCommandOption,
    type APIApplicationCommandSubcommandOption,
    type ChatInputCommandInteraction,
    type Message,
    type SlashCommandOptionsOnlyBuilder,
    type SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import { VortexEmbed } from "./embed";

// Base class for every command.
//
// Commands are written once, as slash commands (chatInputRun). When someone uses the text
// prefix instead (e.g. "->ban @user spam"), messageRun parses the arguments according to
// the slash definition and calls chatInputRun with a stand-in "interaction" built from the
// message, so every command works both ways without extra code.
export class VortexCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    // Reserved for bot-staff-only commands (compared against users.permission).
    public permission_level = 0;

    // The slash command definition. Also drives argument parsing for prefix usage and /help.
    public applicationCommandData!: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

    public override registerApplicationCommands(registry: Command.Registry) {
        if (this.applicationCommandData) registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async messageRun(message: Message, args: Args): Promise<unknown> {
        if (!this.applicationCommandData || !this.chatInputRun) return;

        const values = new Map<string, unknown>();
        let options = (this.applicationCommandData.toJSON().options ?? []) as APIApplicationCommandOption[];
        let subcommand: string | null = null;

        // Commands with subcommands (e.g. "->note add @user text"): the first word picks the subcommand.
        if (options[0]?.type === ApplicationCommandOptionType.Subcommand) {
            const subs = options as APIApplicationCommandSubcommandOption[];
            const word = (await args.pickResult("string")).unwrapOr("").toLowerCase();
            const sub = subs.find((s) => s.name === word);
            if (!sub) {
                return message.reply({
                    content: `Usage: ${subs.map((s) => `\`${this.name} ${s.name}\``).join(", ")}`,
                    allowedMentions: { repliedUser: false }
                });
            }
            subcommand = sub.name;
            options = (sub.options ?? []) as APIApplicationCommandOption[];
        }

        // Parse each option in order, the same way the slash command declares them.
        for (const [i, option] of (options as APIApplicationCommandBasicOption[]).entries()) {
            const parsed = await this.parseOption(option, args, i === options.length - 1);

            if (parsed.error) return message.reply({ content: parsed.error, allowedMentions: { repliedUser: false } });
            if (parsed.value !== undefined) values.set(option.name, parsed.value);
        }

        return this.chatInputRun(createMessageInteraction(message, values, subcommand) as unknown as ChatInputCommandInteraction, {
            commandId: "",
            commandName: this.name
        });
    }

    // Reads one argument for a slash option. Returns { error } with a usage hint when it's missing or invalid.
    private async parseOption(option: APIApplicationCommandBasicOption, args: Args, isLast: boolean): Promise<{ value?: unknown; error?: string }> {
        const required = "required" in option && option.required;
        const missing = () => (required ? { error: `Missing argument \`${option.name}\`. Usage: ${this.usage()}` } : {});

        switch (option.type) {
            case ApplicationCommandOptionType.String: {
                // The last string option takes the rest of the message, so reasons/text can contain spaces.
                const result = isLast ? await args.restResult("string") : await args.pickResult("string");
                if (result.isErr()) return missing();

                const value = result.unwrap();
                if ("choices" in option && option.choices?.length) {
                    const choice = option.choices.find((c) => String(c.value).toLowerCase() === value.toLowerCase() || c.name.toLowerCase() === value.toLowerCase());
                    if (!choice) return { error: `\`${option.name}\` must be one of: ${option.choices.map((c) => c.name).join(", ")}` };
                    return { value: choice.value };
                }
                if ("max_length" in option && option.max_length && value.length > option.max_length) {
                    return { error: `\`${option.name}\` can be at most ${option.max_length} characters.` };
                }
                return { value };
            }

            case ApplicationCommandOptionType.Integer:
            case ApplicationCommandOptionType.Number: {
                const result = await args.pickResult(option.type === ApplicationCommandOptionType.Integer ? "integer" : "number");
                if (result.isErr()) return missing();

                const value = result.unwrap();
                const min = "min_value" in option ? option.min_value : undefined;
                const max = "max_value" in option ? option.max_value : undefined;
                if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
                    return { error: `\`${option.name}\` must be between ${min ?? "-∞"} and ${max ?? "∞"}.` };
                }
                return { value };
            }

            case ApplicationCommandOptionType.Boolean: {
                const result = await args.pickResult("boolean");
                return result.isErr() ? missing() : { value: result.unwrap() };
            }

            case ApplicationCommandOptionType.User: {
                // Prefer a server member; fall back to any user (e.g. someone who already left).
                const member = await args.pickResult("member");
                if (member.isOk()) return { value: member.unwrap().user, };
                const user = await args.pickResult("user");
                return user.isErr() ? missing() : { value: user.unwrap() };
            }

            case ApplicationCommandOptionType.Channel: {
                const result = await args.pickResult("guildChannel");
                return result.isErr() ? missing() : { value: result.unwrap() };
            }

            case ApplicationCommandOptionType.Role: {
                const result = await args.pickResult("role");
                return result.isErr() ? missing() : { value: result.unwrap() };
            }

            default:
                return {};
        }
    }

    // "ban <user> [reason]" style usage line, built from the slash definition.
    // For commands with subcommands: "note <add|list|remove>".
    public usage() {
        const options = (this.applicationCommandData?.toJSON().options ?? []) as APIApplicationCommandOption[];
        if (options[0]?.type === ApplicationCommandOptionType.Subcommand) {
            return `\`${this.name} <${options.map((o) => o.name).join("|")}>\``;
        }
        const parts = (options as APIApplicationCommandBasicOption[]).map((o) => ("required" in o && o.required ? `<${o.name}>` : `[${o.name}]`));
        return `\`${[this.name, ...parts].join(" ")}\``;
    }

    // Embed with a random GIF from nekos.best for the roleplay commands (hug, pat, ...).
    async roleplayEmbed(type: string, title: string) {
        try {
            const res = await fetch(`https://nekos.best/api/v2/${type}`, { signal: AbortSignal.timeout(5000) });
            const body = await res.json() as { results?: { url: string }[] };
            const url = body.results?.[0]?.url;
            if (!url) throw new Error("No image");

            return { embeds: [new VortexEmbed().setTitle(title).setImage(url).setTimestamp()] };
        } catch {
            return { content: `${title} (couldn't load a GIF right now)` };
        }
    }
}

// Builds the stand-in interaction for prefix usage. It covers what commands use from
// ChatInputCommandInteraction: options, user/member/guild/channel, and the reply methods.
function createMessageInteraction(message: Message, values: Map<string, unknown>, subcommand: string | null = null) {
    // The bot's first reply; deferReply/editReply/followUp build on it.
    let response: Message | null = null;

    const get = <T>(name: string, required?: boolean) => {
        const value = values.get(name) as T | undefined;
        if (value === undefined && required) throw new Error(`Missing required option "${name}"`);
        return (value ?? null) as T | null;
    };

    // Interaction replies accept extra fields (ephemeral, flags, fetchReply...) a message can't use.
    const toMessage = (input: any) => {
        if (typeof input === "string") return { content: input };
        const { ephemeral, flags, fetchReply, withResponse, ...rest } = input ?? {};
        return rest;
    };

    return {
        isPollyFilled: true,
        id: message.id,
        user: message.author,
        member: message.member,
        guild: message.guild,
        guildId: message.guildId,
        channel: message.channel,
        channelId: message.channelId,
        client: message.client,
        createdTimestamp: message.createdTimestamp,
        createdAt: message.createdAt,
        commandName: "",
        replied: false,
        deferred: false,
        inGuild: () => message.inGuild(),
        inCachedGuild: () => message.inGuild(),
        options: {
            getSubcommand: (required = true) => {
                if (!subcommand && required) throw new Error("No subcommand given");
                return subcommand;
            },
            getString: (name: string, required?: boolean) => get<string>(name, required),
            getInteger: (name: string, required?: boolean) => get<number>(name, required),
            getNumber: (name: string, required?: boolean) => get<number>(name, required),
            getBoolean: (name: string, required?: boolean) => get<boolean>(name, required),
            getUser: (name: string, required?: boolean) => get(name, required),
            // getMember returns the member for a parsed user, if they're in this server.
            getMember: (name: string) => {
                const user = values.get(name) as { id: string } | undefined;
                return user ? message.guild?.members.cache.get(user.id) ?? null : null;
            },
            getChannel: (name: string, required?: boolean) => get(name, required),
            getRole: (name: string, required?: boolean) => get(name, required),
            data: [...values.entries()].map(([name, value]) => ({ name, value }))
        },
        async reply(input: any) {
            response = await message.reply({ allowedMentions: { repliedUser: false }, ...toMessage(input) });
            this.replied = true;
            return response;
        },
        // There's no "thinking..." state for messages; show typing instead.
        async deferReply() {
            this.deferred = true;
            if ("sendTyping" in message.channel) await message.channel.sendTyping().catch(() => null);
        },
        async editReply(input: any) {
            if (response) return response.edit(toMessage(input));
            return this.reply(input);
        },
        async followUp(input: any) {
            return message.reply({ allowedMentions: { repliedUser: false }, ...toMessage(input) });
        },
        async deleteReply() {
            await response?.delete().catch(() => null);
        },
        async fetchReply() {
            return response;
        }
    };
}

// Replies and returns the sent Message, for both slash commands and prefix usage.
// Needed when a command attaches a button collector to its own reply (games, polls...).
export async function replyAndFetch(ctx: ChatInputCommandInteraction, payload: Parameters<ChatInputCommandInteraction["reply"]>[0] & object): Promise<Message> {
    const result = await ctx.reply({ ...(payload as object), withResponse: true } as never) as unknown;

    // Slash: InteractionCallbackResponse. Prefix stand-in: the Message itself.
    const message = (result as { resource?: { message?: Message | null } }).resource?.message ?? (result as Message);
    return message;
}
