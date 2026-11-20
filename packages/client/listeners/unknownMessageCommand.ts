import { Events, Listener, type UnknownMessageCommandPayload } from "@sapphire/framework";
import { CustomCommands, DBManager } from "../lib/database";
import { isBlacklisted } from "../lib/owner";
import { renderTemplate } from "../lib/settings";
import { VortexEmbed } from "../lib/structures/embed";

// Sapphire fires this when a message starts with the prefix but names no built-in command.
// That's where the server's custom commands (made in the dashboard) are looked up and answered.
export class UnknownMessageCommandListener extends Listener<typeof Events.UnknownMessageCommand> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.UnknownMessageCommand
        });
    }

    public async run({ message, commandName, commandPrefix, prefix }: UnknownMessageCommandPayload) {
        if (!message.inGuild() || message.author.bot) return;
        if (isBlacklisted(message.author.id, message.guildId)) return;

        // Server aliases (Dashboard → Commands → Aliases): run the real command through Sapphire's
        // normal pipeline, so permissions, cooldowns and channel rules still apply.
        const { settings: config } = await DBManager.getGuildConfig(message.guildId);
        const alias = config.aliases.find((a) => a.alias === commandName.toLowerCase());
        const target = alias ? this.container.stores.get("commands").get(alias.command) : undefined;
        if (target) {
            const parameters = message.content.slice(commandPrefix.length + commandName.length).trim();
            this.container.client.emit(Events.PreMessageCommandRun, { message, command: target as never, parameters, context: { commandName: target.name, commandPrefix, prefix } });
            return;
        }

        const command = await CustomCommands.findByName(message.guildId, commandName.toLowerCase());
        if (!command) return;

        // Respect the same command-channel rules as built-in commands.
        const { settings } = await DBManager.getGuildConfig(message.guildId);
        const { mode, channelIds } = settings.commandChannels;
        const listed = channelIds.includes(message.channelId);
        if ((mode === "allow" && !listed) || (mode === "deny" && listed)) return;

        // Everything after "<prefix><name>" is available as {args}.
        const args = message.content.slice(commandPrefix.length + commandName.length).trim();

        const content = renderTemplate(command.response, {
            user: { id: message.author.id, username: message.author.username, displayName: message.member?.displayName },
            server: { name: message.guild.name, memberCount: message.guild.memberCount },
            channelId: message.channelId,
            args
        });

        // Never let a custom command ping @everyone/@here or roles.
        const allowedMentions = { parse: ["users" as const] };

        if (command.embed) {
            await message.reply({ embeds: [new VortexEmbed().setDescription(content.slice(0, 4096))], allowedMentions });
        } else {
            await message.reply({ content: content.slice(0, 2000), allowedMentions });
        }

        await CustomCommands.recordUse(command.id).catch(() => null);
        await DBManager.logCommand({ guildId: message.guildId, userId: message.author.id, command: `custom:${command.name}`, parameters: args });
    }
}
