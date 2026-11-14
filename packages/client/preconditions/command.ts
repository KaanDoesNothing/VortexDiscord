import { AllFlowsPrecondition, Command } from "@sapphire/framework";
import { PermissionFlagsBits, type ChatInputCommandInteraction, type ContextMenuCommandInteraction, type GuildMember, type Message } from "discord.js";
import { DBManager } from "../lib/database";
import { isBlacklisted, isGloballyDisabled, isOwner } from "../lib/owner";

// "guild:command:user" → when that user may use the command again.
const cooldowns = new Map<string, number>();
const sweepCooldowns = () => {
    const now = Date.now();
    for (const [key, readyAt] of cooldowns) if (readyAt <= now) cooldowns.delete(key);
};

// Runs before every command (slash and prefix) and applies the server's dashboard rules:
// disabled commands, which channels commands work in, and per-command role/channel/cooldown rules.
export class CommandCheckPrecondition extends AllFlowsPrecondition {
    public constructor(context: AllFlowsPrecondition.LoaderContext, options: AllFlowsPrecondition.Options) {
        super(context, {
            ...options,
            position: 20
        });
    }

    public override chatInputRun(interaction: ChatInputCommandInteraction, command: Command) {
        return this.check(interaction.guildId, interaction.channelId, interaction.member as GuildMember | null, interaction.user.id, command);
    }

    public override messageRun(message: Message, command: Command) {
        return this.check(message.guildId, message.channelId, message.member, message.author.id, command);
    }

    public override contextMenuRun(_interaction: ContextMenuCommandInteraction) {
        return this.ok();
    }

    private async check(guildId: string | null, channelId: string, member: GuildMember | null, userId: string, command: Command) {
        // Blacklisted users/servers are ignored silently (no reply).
        if (isBlacklisted(userId, guildId)) return this.error({ message: "Blacklisted", context: { silent: true } });

        // Turned off everywhere by the bot owner (maintenance). Owners can still use it.
        if (isGloballyDisabled(command.name) && !isOwner(userId)) {
            return this.error({ message: "This command is temporarily unavailable. Please try again later." });
        }
        // DMs have no server settings.
        if (!guildId) return this.ok();

        const { disabledCommands, settings } = await DBManager.getGuildConfig(guildId);

        if (disabledCommands.includes(command.name)) return this.error({ message: "This command is disabled on this server." });

        // "command" stays usable everywhere so admins can't lock themselves out.
        if (command.name !== "command") {
            const { mode, channelIds } = settings.commandChannels;
            const listed = channelIds.includes(channelId);

            if ((mode === "allow" && !listed) || (mode === "deny" && listed)) {
                return this.error({ message: "Commands can't be used in this channel." });
            }
        }

        // Per-command rules from the dashboard (Commands page → ⚙ on a command).
        const rule = settings.commandRules[command.name];
        if (rule) {
            // Members who can manage the server always pass role/channel rules.
            const isManager = member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

            if (!isManager && rule.channelIds.length && !rule.channelIds.includes(channelId)) {
                return this.error({ message: `\`${command.name}\` can only be used in ${rule.channelIds.map((id) => `<#${id}>`).join(", ")}.` });
            }
            if (!isManager && rule.roleIds.length && !rule.roleIds.some((id) => member?.roles.cache.has(id))) {
                return this.error({ message: `You need one of these roles to use \`${command.name}\`: ${rule.roleIds.map((id) => `<@&${id}>`).join(", ")}.` });
            }

            if (rule.cooldownSeconds > 0) {
                const key = `${guildId}:${command.name}:${userId}`;
                const readyAt = cooldowns.get(key) ?? 0;
                if (readyAt > Date.now()) {
                    return this.error({ message: `Slow down! You can use \`${command.name}\` again <t:${Math.ceil(readyAt / 1000)}:R>.` });
                }
                cooldowns.set(key, Date.now() + rule.cooldownSeconds * 1000);
                if (cooldowns.size > 50_000) sweepCooldowns();
            }
        }

        return this.ok();
    }
}
