import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder } from "discord.js";
import { DBManager, Dashboard } from "../../lib/database";
import { resolveSettings } from "../../lib/settings";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Features that can be toggled / given a channel from Discord. Everything else is in the dashboard.
const FEATURES = {
    leveling: { label: "Leveling", channelKey: "announceChannelId" },
    welcome: { label: "Welcome messages", channelKey: "channelId" },
    goodbye: { label: "Goodbye messages", channelKey: "channelId" },
    modLog: { label: "Mod log", channelKey: "channelId" },
    automod: { label: "Auto-mod", channelKey: null },
    starboard: { label: "Starboard", channelKey: "channelId" },
    birthdays: { label: "Birthday announcements", channelKey: "channelId" },
    tickets: { label: "Tickets", channelKey: "logChannelId" },
    suggestions: { label: "Suggestions", channelKey: "channelId" }
} as const;
type Feature = keyof typeof FEATURES;

const choices = (withChannel: boolean) => (Object.entries(FEATURES) as [Feature, (typeof FEATURES)[Feature]][])
    .filter(([, f]) => !withChannel || f.channelKey)
    .map(([value, f]) => ({ name: f.label, value }));

// /settings view|toggle|channel: quick server configuration from inside Discord.
export class SettingsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["config", "setup"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View or change this server's bot settings")
        .addSubcommand((s) => s.setName("view").setDescription("Show what's turned on"))
        .addSubcommand((s) => s.setName("toggle").setDescription("Turn a feature on or off")
            .addStringOption((o) => o.setName("feature").setDescription("Which feature").setRequired(true).addChoices(...choices(false))))
        .addSubcommand((s) => s.setName("channel").setDescription("Set the channel a feature posts in")
            .addStringOption((o) => o.setName("feature").setDescription("Which feature").setRequired(true).addChoices(...choices(true)))
            .addChannelOption((o) => o.setName("channel").setDescription("Channel (leave empty to clear)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const config = await DBManager.getGuildConfig(guildId);
        const s = config.settings;

        if (ctx.options.getSubcommand() === "view") {
            const lines = (Object.entries(FEATURES) as [Feature, (typeof FEATURES)[Feature]][]).map(([key, f]) => {
                const section = s[key] as unknown as Record<string, unknown>;
                const channel = f.channelKey ? section[f.channelKey] as string | null : null;
                return `${section.enabled ? "🟢" : "⚫"} **${f.label}**${channel ? ` → <#${channel}>` : ""}`;
            });

            const embed = new VortexEmbed()
                .setTitle(`⚙️ Settings for ${ctx.guild!.name}`)
                .setDescription(lines.join("\n"))
                .addField("Prefix", `\`${config.prefix}\``, true)
                .addField("Disabled commands", config.disabledCommands.length ? config.disabledCommands.map((c) => `\`${c}\``).join(" ") : "None", true)
                .setFooter({ text: "Everything else (messages, rules, roles...) is in the web dashboard" });
            return ctx.reply({ embeds: [embed], ephemeral: true });
        }

        const feature = ctx.options.getString("feature", true) as Feature;
        const { label, channelKey } = FEATURES[feature];
        const section = s[feature] as unknown as Record<string, unknown>;

        const patch = ctx.options.getSubcommand() === "toggle"
            ? { [feature]: { enabled: !section.enabled } }
            : { [feature]: { [channelKey!]: ctx.options.getChannel("channel")?.id ?? null } };

        const { settings, errors } = resolveSettings(patch, s);
        if (errors.length) return ctx.reply({ content: errors.join("\n"), ephemeral: true });

        await Dashboard.updateGuildSettings(guildId, { settings });
        await Dashboard.addAudit(guildId, ctx.user.id, "settings.update", { via: "command", patch });

        const updated = settings[feature] as unknown as Record<string, unknown>;
        if (ctx.options.getSubcommand() === "toggle") {
            const hint = updated.enabled && channelKey && !updated[channelKey] ? ` Set its channel with \`/settings channel\`.` : "";
            return ctx.reply({ content: `${updated.enabled ? "🟢" : "⚫"} **${label}** is now **${updated.enabled ? "on" : "off"}**.${hint}`, ephemeral: true });
        }
        const channelId = updated[channelKey!] as string | null;
        return ctx.reply({ content: channelId ? `**${label}** will use <#${channelId}>.` : `**${label}** channel cleared.`, ephemeral: true });
    }
}
