import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { auditReason, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { fail, ok, warn } from "../../lib/structures/embed";

const MAX = 200;

// /massban <ids> [reason]: ban up to 200 user IDs at once (raid cleanup). Uses Discord's bulk ban,
// so it works for accounts that already left. Asks for confirmation first.
export class MassbanCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredClientPermissions: ["BanMembers", "ManageGuild"], requiredUserPermissions: ["BanMembers", "ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("massban")
        .setDescription("Ban many users at once by ID or mention, e.g. after a raid")
        .addStringOption((o) => o.setName("users").setDescription("User IDs or mentions separated by spaces or commas").setMaxLength(6000).setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why").setMaxLength(400))
        .addIntegerOption((o) => o.setName("delete_days").setDescription("Delete their messages from the last N days (0-7)").setMinValue(0).setMaxValue(7));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const ids = [...new Set(ctx.options.getString("users", true).match(/\d{15,25}/g) ?? [])]
            // Never yourself, the bot or the owner.
            .filter((id) => id !== ctx.user.id && id !== ctx.client.user.id && id !== guild.ownerId);
        if (!ids.length) return ctx.reply(fail("Give at least one user ID or mention."));
        if (ids.length > MAX) return ctx.reply(fail(`At most ${MAX} users at a time.`));

        // Members whose role is at or above yours (or the bot's) can't be included.
        const me = guild.members.me!;
        const moderator = await guild.members.fetch(ctx.user.id);
        const protectedIds = ids.filter((id) => {
            const m = guild.members.cache.get(id);
            return m && (m.roles.highest.position >= me.roles.highest.position || (moderator.id !== guild.ownerId && m.roles.highest.position >= moderator.roles.highest.position));
        });
        const targets = ids.filter((id) => !protectedIds.includes(id));
        if (!targets.length) return ctx.reply(fail("None of those users can be banned (their roles are too high)."));

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("confirm").setLabel(`Ban ${targets.length} users`).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );
        const message = await replyAndFetch(ctx, {
            ...warn(`Ban **${targets.length}** user${targets.length === 1 ? "" : "s"}?${protectedIds.length ? ` (${protectedIds.length} skipped: roles too high)` : ""}\nReason: ${reason}`),
            components: [row]
        });
        const click = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 30_000 }).catch(() => null);
        if (!click || click.customId === "cancel") return message.edit({ embeds: ok("Cancelled.").embeds, components: [] }).catch(() => null);
        await click.deferUpdate();

        const result = await guild.bans.bulkCreate(targets, { reason: auditReason(ctx.user, `Mass ban: ${reason}`), deleteMessageSeconds: (ctx.options.getInteger("delete_days") ?? 0) * 86_400 }).catch(() => null);
        if (!result) return message.edit({ embeds: fail("Discord refused the mass ban. Try fewer users at once.").embeds, components: [] });

        // One mod-log case per banned user.
        for (const id of result.bannedUsers) {
            const user = await ctx.client.users.fetch(id).catch(() => null);
            if (user) await logModAction(guild, { type: "ban", moderator: ctx.user, target: user, reason: `Mass ban: ${reason}` });
        }
        return message.edit({ embeds: ok(`Banned **${result.bannedUsers.length}** user${result.bannedUsers.length === 1 ? "" : "s"}.${result.failedUsers.length ? ` ${result.failedUsers.length} failed.` : ""}`).embeds, components: [] });
    }
}
