import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { Dashboard } from "../../lib/database";
import { linkButtons } from "../../lib/links";
import { VortexCommand } from "../../lib/structures/command";
import { fail, VortexEmbed } from "../../lib/structures/embed";

// Presets: a sensible starting configuration for common kinds of servers, applied in one command.
// Everything can be fine-tuned afterwards in the dashboard.
const PRESETS = {
    community: {
        label: "Community",
        description: "Welcome messages, leveling with announcements, auto-mod, starboard-ready",
        settings: (ch: Channels) => ({
            welcome: { enabled: Boolean(ch.welcome), channelId: ch.welcome, image: true },
            goodbye: { enabled: Boolean(ch.welcome), channelId: ch.welcome },
            leveling: { enabled: true, announce: true, announceChannelId: null, cooldownSeconds: 60 },
            automod: { enabled: true, blockInvites: true, blockPhishing: true, spam: { enabled: true }, duplicates: { enabled: true }, maxMentions: 6, action: "delete" },
            modLog: { enabled: Boolean(ch.logs), channelId: ch.logs },
            logs: { messages: ch.logs, members: ch.logs, moderation: ch.logs },
            antiRaid: { enabled: true, action: "alert", alertChannelId: ch.logs }
        })
    },
    gaming: {
        label: "Gaming",
        description: "Leveling with voice XP, temp voice ready, economy and games, light auto-mod",
        settings: (ch: Channels) => ({
            welcome: { enabled: Boolean(ch.welcome), channelId: ch.welcome },
            leveling: { enabled: true, announce: true, voice: { enabled: true, xpPerMinute: 10 } },
            automod: { enabled: true, blockPhishing: true, blockInvites: true, spam: { enabled: true }, action: "delete" },
            economy: { gambling: { enabled: true } },
            modLog: { enabled: Boolean(ch.logs), channelId: ch.logs },
            logs: { members: ch.logs, voice: ch.logs }
        })
    },
    small: {
        label: "Small / friends",
        description: "Just the fun stuff: leveling, economy, birthdays. No auto-mod",
        settings: (ch: Channels) => ({
            welcome: { enabled: Boolean(ch.welcome), channelId: ch.welcome },
            leveling: { enabled: true, announce: true, cooldownSeconds: 30 },
            birthdays: { enabled: Boolean(ch.welcome), channelId: ch.welcome },
            automod: { enabled: false }
        })
    },
    moderation: {
        label: "Moderation only",
        description: "Strict auto-mod, anti-raid lockdown, logs, DMs on punishments. Leveling off",
        settings: (ch: Channels) => ({
            leveling: { enabled: false },
            automod: { enabled: true, blockInvites: true, blockPhishing: true, maxMentions: 5, spam: { enabled: true }, duplicates: { enabled: true }, caps: { enabled: true }, zalgo: true, action: "warn" },
            warnThresholds: [{ count: 3, action: "timeout", durationMinutes: 60 }, { count: 5, action: "kick", durationMinutes: 60 }, { count: 7, action: "ban", durationMinutes: 60 }],
            moderation: { dmOnAction: true },
            modLog: { enabled: Boolean(ch.logs), channelId: ch.logs },
            logs: { messages: ch.logs, members: ch.logs, roles: ch.logs, server: ch.logs, moderation: ch.logs },
            antiRaid: { enabled: true, action: "lockdown", alertChannelId: ch.logs }
        })
    }
} as const;
type Channels = { welcome: string | null; logs: string | null };

// /setup <preset> [welcome_channel] [log_channel]: one-command starting configuration.
export class SetupCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["quickstart"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Set the bot up for your kind of server in one step (admins)")
        .addStringOption((o) => o.setName("preset").setDescription("What kind of server this is").setRequired(true)
            .addChoices(...Object.entries(PRESETS).map(([value, p]) => ({ name: `${p.label}: ${p.description}`.slice(0, 100), value }))))
        .addChannelOption((o) => o.setName("welcome_channel").setDescription("Where welcome messages go (defaults to the server's system channel)").addChannelTypes(ChannelType.GuildText))
        .addChannelOption((o) => o.setName("log_channel").setDescription("Where mod and event logs go (optional)").addChannelTypes(ChannelType.GuildText));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const preset = PRESETS[ctx.options.getString("preset", true) as keyof typeof PRESETS];
        if (!preset) return ctx.reply(fail("Unknown preset."));

        const welcome = (ctx.options.getChannel("welcome_channel") as GuildTextBasedChannel | null) ?? guild.systemChannel;
        const logs = ctx.options.getChannel("log_channel") as GuildTextBasedChannel | null;
        const channels = { welcome: welcome?.id ?? null, logs: logs?.id ?? null };

        const { errors } = await Dashboard.patchSettings(guild.id, preset.settings(channels) as Record<string, unknown>);
        if (errors.length) return ctx.reply(fail(errors.join(". ")));
        await Dashboard.addAudit(guild.id, ctx.user.id, "setup.preset", { preset: preset.label, ...channels });

        const embed = new VortexEmbed()
            .setTitle(`✅ Set up as: ${preset.label}`)
            .setDescription(preset.description)
            .addField("Welcome channel", channels.welcome ? `<#${channels.welcome}>` : "None (welcome messages stay off)", true)
            .addField("Log channel", channels.logs ? `<#${channels.logs}>` : "None (add one later for mod logs)", true)
            .addField("Next steps", [
                "• Fine-tune everything in the **dashboard**",
                "• `/verify panel` to add a verification gate",
                "• `/ticket panel` for support tickets",
                "• `/feed add` to post YouTube, Twitch or Reddit updates",
                "• `/shop add` to sell roles and items for coins"
            ].join("\n"));

        return ctx.reply({ embeds: [embed], components: linkButtons(ctx.client, ["dashboard", "support"], guild.id) });
    }
}
