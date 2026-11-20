import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder, type GuildMember, type Role } from "discord.js";
import { auditReason, fetchMember } from "../../lib/moderation";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { fail, ok, warn } from "../../lib/structures/embed";

// Members per second for /role all (Discord rate limits role changes).
const PER_SECOND = 5;

// /role add|remove|all|clear: give or take roles. You can only manage roles below your own highest role.
export class RoleCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredClientPermissions: ["ManageRoles"], requiredUserPermissions: ["ManageRoles"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("role")
        .setDescription("Give or take a role from one member, or from everyone")
        .addSubcommand((s) => s.setName("add").setDescription("Give a member a role")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
            .addRoleOption((o) => o.setName("role").setDescription("Which role").setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Take a role from a member")
            .addUserOption((o) => o.setName("member").setDescription("Who").setRequired(true))
            .addRoleOption((o) => o.setName("role").setDescription("Which role").setRequired(true)))
        .addSubcommand((s) => s.setName("all").setDescription("Give a role to every member (or every human/bot)")
            .addRoleOption((o) => o.setName("role").setDescription("Which role").setRequired(true))
            .addStringOption((o) => o.setName("who").setDescription("Who gets it (default: humans)").addChoices({ name: "Humans", value: "humans" }, { name: "Bots", value: "bots" }, { name: "Everyone", value: "all" })))
        .addSubcommand((s) => s.setName("clear").setDescription("Take a role from everyone who has it")
            .addRoleOption((o) => o.setName("role").setDescription("Which role").setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const sub = ctx.options.getSubcommand();
        const role = guild.roles.cache.get(ctx.options.getRole("role", true).id)!;
        const moderator = ctx.member as GuildMember;

        if (!role.editable || role.managed || role.id === guild.id) return ctx.reply(fail(`I can't manage ${role}: it's above my highest role, managed by an integration, or @everyone.`));
        if (moderator.id !== guild.ownerId && role.position >= moderator.roles.highest.position) return ctx.reply(fail(`You can only manage roles below your own highest role.`));

        if (sub === "add" || sub === "remove") {
            const user = ctx.options.getUser("member", true);
            const member = await fetchMember(guild, user.id);
            if (!member) return ctx.reply(fail(`${user.tag} isn't in this server.`));
            const adding = sub === "add";
            if (adding === member.roles.cache.has(role.id)) return ctx.reply(fail(`${user} ${adding ? "already has" : "doesn't have"} ${role}.`));
            if (adding) await member.roles.add(role, auditReason(ctx.user, "Role added"));
            else await member.roles.remove(role, auditReason(ctx.user, "Role removed"));
            return ctx.reply({ ...ok(adding ? `Gave ${user} ${role}.` : `Took ${role} from ${user}.`), allowedMentions: { parse: [] } });
        }

        return this.bulk(ctx, role, sub === "all");
    }

    // Everyone at once, a few members per second, with progress updates.
    private async bulk(ctx: Command.ChatInputCommandInteraction, role: Role, adding: boolean) {
        const guild = ctx.guild!;
        const members = await guild.members.fetch().catch(() => null);
        if (!members) return ctx.reply(fail("I couldn't load the member list (the bot needs the Server Members intent for this)."));

        const who = ctx.options.getString("who") ?? "humans";
        const targets = [...members.filter((m) => adding
            ? !m.roles.cache.has(role.id) && (who === "all" || (who === "bots") === m.user.bot)
            : m.roles.cache.has(role.id)).values()];
        if (!targets.length) return ctx.reply(fail("Nobody to change."));

        const seconds = Math.ceil(targets.length / PER_SECOND);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("confirm").setLabel(adding ? `Give to ${targets.length}` : `Take from ${targets.length}`).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );
        const message = await replyAndFetch(ctx, { ...warn(`${adding ? "Give" : "Take"} ${role} ${adding ? "to" : "from"} **${targets.length}** members? This takes about ${seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`}.`), components: [row], allowedMentions: { parse: [] } });
        const click = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 30_000 }).catch(() => null);
        if (!click || click.customId === "cancel") return message.edit({ embeds: ok("Cancelled.").embeds, components: [] }).catch(() => null);
        await click.update({ embeds: warn(`Working… 0/${targets.length}`).embeds, components: [] });

        let done = 0, failed = 0;
        const reason = auditReason(ctx.user, adding ? "Role given to everyone" : "Role taken from everyone");
        for (const [i, member] of targets.entries()) {
            const ok = await (adding ? member.roles.add(role, reason) : member.roles.remove(role, reason)).then(() => true, () => false);
            if (ok) done++; else failed++;
            if ((i + 1) % PER_SECOND === 0) await Bun.sleep(1000);
            if ((i + 1) % 50 === 0) await message.edit({ embeds: warn(`Working… ${i + 1}/${targets.length}`).embeds }).catch(() => null);
        }
        return message.edit({ embeds: ok(`${adding ? "Gave" : "Took"} ${role} ${adding ? "to" : "from"} **${done}** members.${failed ? ` ${failed} failed.` : ""}`).embeds, allowedMentions: { parse: [] } });
    }
}
