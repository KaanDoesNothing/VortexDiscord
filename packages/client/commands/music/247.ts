import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Dashboard } from "../../lib/database";
import { resolveSettings } from "../../lib/settings";
import { MusicCommand } from "../../lib/music/command";

// /247: stay in the voice channel even when nothing is playing or everyone leaves (saved per server).
export class TwentyFourSevenCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["24/7", "stay"], requiredUserPermissions: ["ManageGuild"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("247")
        .setDescription("Stay in voice 24/7, even when idle or alone (Manage Server)");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { settings: current } = await DBManager.getGuildConfig(ctx.guildId!);
        const on = !current.music.stay247;

        const { settings } = resolveSettings({ music: { stay247: on } }, current);
        await Dashboard.updateGuildSettings(ctx.guildId!, { settings });
        await Dashboard.addAudit(ctx.guildId!, ctx.user.id, "settings.update", { via: "command", fields: ["music.stay247"] });

        return ctx.reply({ content: on ? "🌙 24/7 mode is **on**: I'll stay in voice even when idle or alone." : "24/7 mode is **off**: I'll leave when idle or alone." });
    }
}
