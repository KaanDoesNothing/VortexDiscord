import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, MessageFlags } from "discord.js";
import { DBManager, Dashboard } from "../../lib/database";
import { dropForeignIds, resolveSettings } from "../../lib/settings";
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
    suggestions: { label: "Suggestions", channelKey: "channelId" },
    antiRaid: { label: "Anti-raid", channelKey: "alertChannelId" },
    verification: { label: "Verification", channelKey: null },
    tempVoice: { label: "Temp voice channels", channelKey: null }
} as const;
type Feature = keyof typeof FEATURES;

const choices = (withChannel: boolean) => (Object.entries(FEATURES) as [Feature, (typeof FEATURES)[Feature]][])
    .filter(([, f]) => !withChannel || f.channelKey)
    .map(([value, f]) => ({ name: f.label, value }));

// /settings view|toggle|channel: quick server configuration from inside Discord.
export class SettingsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["config"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View or change this server's bot settings")
        .addSubcommand((s) => s.setName("view").setDescription("Show what's turned on"))
        .addSubcommand((s) => s.setName("toggle").setDescription("Turn a feature on or off")
            .addStringOption((o) => o.setName("feature").setDescription("Which feature").setRequired(true).addChoices(...choices(false))))
        .addSubcommand((s) => s.setName("channel").setDescription("Set the channel a feature posts in")
            .addStringOption((o) => o.setName("feature").setDescription("Which feature").setRequired(true).addChoices(...choices(true)))
            .addChannelOption((o) => o.setName("channel").setDescription("Channel (leave empty to clear)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
        .addSubcommand((s) => s.setName("export").setDescription("Download all settings as a file (a backup, or to copy them to another server)"))
        .addSubcommand((s) => s.setName("import").setDescription("Load settings from an exported file (replaces the current settings)")
            .addAttachmentOption((o) => o.setName("file").setDescription("A file made with /settings export").setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const config = await DBManager.getGuildConfig(guildId);
        const s = config.settings;

        if (ctx.options.getSubcommand() === "export") {
            const data = JSON.stringify({ vortexSettings: 1, exportedFrom: ctx.guild!.name, exportedAt: new Date().toISOString(), prefix: config.prefix, disabledCommands: config.disabledCommands, settings: s }, null, 2);
            return ctx.reply({
                content: "Here are this server's settings. Import them anywhere with `/settings import`. Channel and role choices only work on this server; on another one they're cleared.",
                files: [{ name: `settings-${guildId}.json`, attachment: Buffer.from(data) }],
                flags: MessageFlags.Ephemeral
            });
        }

        if (ctx.options.getSubcommand() === "import") {
            const file = ctx.options.getAttachment("file", true);
            if (file.size > 512_000) return ctx.reply({ content: "That file is too big to be a settings export.", flags: MessageFlags.Ephemeral });
            const parsed = await fetch(file.url).then((r) => r.json()).catch(() => null) as { vortexSettings?: number; prefix?: string; disabledCommands?: string[]; settings?: Record<string, unknown> } | null;
            if (!parsed?.vortexSettings || !parsed.settings) return ctx.reply({ content: "That isn't a file made with `/settings export`.", flags: MessageFlags.Ephemeral });

            // Validate everything; channel/role IDs from another server are dropped by the cleanup below.
            const { settings, errors } = resolveSettings(parsed.settings);
            const cleaned = dropForeignIds(settings, ctx.guild!);
            const commands = this.container.stores.get("commands");
            const disabledCommands = (parsed.disabledCommands ?? []).filter((c) => typeof c === "string" && commands.has(c) && c !== "command");
            const prefix = typeof parsed.prefix === "string" && parsed.prefix.length >= 1 && parsed.prefix.length <= 10 ? parsed.prefix : config.prefix;

            await Dashboard.updateGuildSettings(guildId, { settings: cleaned, disabledCommands, prefix });
            await Dashboard.addAudit(guildId, ctx.user.id, "settings.import", { from: (parsed as { exportedFrom?: string }).exportedFrom ?? "file" });
            return ctx.reply({ content: `✅ Settings imported.${errors.length ? ` Some values were invalid and were reset: ${errors.slice(0, 5).join("; ")}` : ""}`, flags: MessageFlags.Ephemeral });
        }

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
            return ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const feature = ctx.options.getString("feature", true) as Feature;
        const { label, channelKey } = FEATURES[feature];
        const section = s[feature] as unknown as Record<string, unknown>;

        const patch = ctx.options.getSubcommand() === "toggle"
            ? { [feature]: { enabled: !section.enabled } }
            : { [feature]: { [channelKey!]: ctx.options.getChannel("channel")?.id ?? null } };

        const { settings, errors } = resolveSettings(patch, s);
        if (errors.length) return ctx.reply({ content: errors.join("\n"), flags: MessageFlags.Ephemeral });

        await Dashboard.updateGuildSettings(guildId, { settings });
        await Dashboard.addAudit(guildId, ctx.user.id, "settings.update", { via: "command", patch });

        const updated = settings[feature] as unknown as Record<string, unknown>;
        if (ctx.options.getSubcommand() === "toggle") {
            const hint = updated.enabled && channelKey && !updated[channelKey] ? ` Set its channel with \`/settings channel\`.` : "";
            return ctx.reply({ content: `${updated.enabled ? "🟢" : "⚫"} **${label}** is now **${updated.enabled ? "on" : "off"}**.${hint}`, flags: MessageFlags.Ephemeral });
        }
        const channelId = updated[channelKey!] as string | null;
        return ctx.reply({ content: channelId ? `**${label}** will use <#${channelId}>.` : `**${label}** channel cleared.`, flags: MessageFlags.Ephemeral });
    }
}
