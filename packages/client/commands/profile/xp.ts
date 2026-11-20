import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { applyLevelRewards, resetAllXp, setXp, xpForLevel } from "../../lib/leveling";
import { fetchMember } from "../../lib/moderation";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { fail, ok, warn } from "../../lib/structures/embed";

// /xp add|remove|set|setlevel|reset|reset-all: manage members' XP. Needs Manage Server.
// Level rewards are updated to match the new level.
export class XpCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("xp")
        .setDescription("Give, take or reset members' leveling XP (admins)")
        .addSubcommand((s) => s.setName("add").setDescription("Give a member XP")
            .addUserOption((o) => o.setName("member").setDescription("Who gets the XP").setRequired(true))
            .addIntegerOption((o) => o.setName("amount").setDescription("How much XP").setMinValue(1).setMaxValue(100_000_000).setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Take XP away from a member")
            .addUserOption((o) => o.setName("member").setDescription("Whose XP to lower").setRequired(true))
            .addIntegerOption((o) => o.setName("amount").setDescription("How much XP").setMinValue(1).setMaxValue(100_000_000).setRequired(true)))
        .addSubcommand((s) => s.setName("set").setDescription("Set a member's total XP")
            .addUserOption((o) => o.setName("member").setDescription("Whose XP to set").setRequired(true))
            .addIntegerOption((o) => o.setName("amount").setDescription("Their new total XP").setMinValue(0).setMaxValue(100_000_000).setRequired(true)))
        .addSubcommand((s) => s.setName("setlevel").setDescription("Put a member at the start of a level")
            .addUserOption((o) => o.setName("member").setDescription("Whose level to set").setRequired(true))
            .addIntegerOption((o) => o.setName("level").setDescription("Their new level").setMinValue(1).setMaxValue(1000).setRequired(true)))
        .addSubcommand((s) => s.setName("reset").setDescription("Reset one member's XP to zero")
            .addUserOption((o) => o.setName("member").setDescription("Whose XP to reset").setRequired(true)))
        .addSubcommand((s) => s.setName("reset-all").setDescription("Reset EVERY member's XP on this server (asks to confirm)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const sub = ctx.options.getSubcommand();
        const { settings } = await DBManager.getGuildConfig(guildId);

        if (sub === "reset-all") return this.resetAll(ctx);

        const user = ctx.options.getUser("member", true);
        if (user.bot) return ctx.reply(fail("Bots don't level up."));

        const amount = ctx.options.getInteger("amount") ?? 0;
        const change = sub === "add" ? { add: amount }
            : sub === "remove" ? { add: -amount }
                : sub === "set" ? { set: amount }
                    : sub === "setlevel" ? { set: xpForLevel(ctx.options.getInteger("level", true), settings.leveling.difficulty) }
                        : { set: 0 };

        const result = await setXp(guildId, user.id, change);

        const member = await fetchMember(ctx.guild!, user.id);
        if (member) await applyLevelRewards(member, result.level, settings.leveling.rewards, settings.leveling.stackRewards).catch(() => null);

        return ctx.reply({ ...ok(`${user} now has **${result.xp.toLocaleString("en-US")} XP** (level **${result.level}**).`), allowedMentions: { parse: [] } });
    }

    // Asks for confirmation with a button, because this can't be undone.
    private async resetAll(ctx: Command.ChatInputCommandInteraction) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("confirm").setLabel("Reset everyone's XP").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );
        const message = await replyAndFetch(ctx, { ...warn("This sets **every member's** XP and level on this server back to zero. It can't be undone."), components: [row] });

        const click = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 30_000 }).catch(() => null);
        if (!click || click.customId === "cancel") {
            return message.edit({ embeds: ok("Cancelled. Nothing was changed.").embeds, components: [] }).catch(() => null);
        }

        const count = await resetAllXp(ctx.guildId!);
        return click.update({ embeds: ok(`Reset XP for **${count.toLocaleString("en-US")}** members.`).embeds, components: [] });
    }
}

