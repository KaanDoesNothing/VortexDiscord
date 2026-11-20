import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction, GuildMember, StringSelectMenuInteraction } from "discord.js";
import { Engagement } from "../lib/database";
import { MessageFlags } from "discord.js";

// Buttons on role panels ("rolepanel:<panelId>:<roleId>"): toggles the role on the member.
// In "single" mode, picking a role removes the panel's other roles.
export class RolePanelButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        const [kind, panelId, roleId] = interaction.customId.split(":");
        if (kind !== "rolepanel" || !panelId || !roleId) return this.none();
        return this.some({ panelId: Number(panelId), roleId });
    }

    public async run(interaction: ButtonInteraction, { panelId, roleId }: { panelId: number; roleId: string }) {
        if (!interaction.inCachedGuild()) return;

        const panel = await Engagement.getRolePanel(panelId);
        // The panel may have been edited since this message was posted; only allow its current roles.
        if (!panel || !panel.roles.some((r) => r.roleId === roleId)) {
            return interaction.reply({ content: "This button is out of date. Ask an admin to re-post the panel.", flags: MessageFlags.Ephemeral });
        }

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role || !role.editable || role.managed) {
            return interaction.reply({ content: "I can't give that role (it's above my highest role, or managed by an integration).", flags: MessageFlags.Ephemeral });
        }

        const member = interaction.member as GuildMember;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, "Role panel");
            return interaction.reply({ content: `Removed ${role}.`, flags: MessageFlags.Ephemeral });
        }

        // Single mode: drop the panel's other roles first.
        if (panel.mode === "single") {
            const others = panel.roles.map((r) => r.roleId).filter((id) => id !== roleId && member.roles.cache.has(id));
            if (others.length) await member.roles.remove(others, "Role panel (single choice)");
        }

        await member.roles.add(roleId, "Role panel");
        return interaction.reply({ content: `Gave you ${role}.`, flags: MessageFlags.Ephemeral });
    }
}

// Dropdown role panels ("rolepanel:<panelId>:menu"): the member ends up with exactly the panel roles
// they picked; panel roles they unpicked are removed.
export class RolePanelMenuHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, name: "RolePanelMenu", interactionHandlerType: InteractionHandlerTypes.SelectMenu });
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        const [kind, panelId, part] = interaction.customId.split(":");
        if (kind !== "rolepanel" || part !== "menu") return this.none();
        return this.some(Number(panelId));
    }

    public async run(interaction: StringSelectMenuInteraction, panelId: number) {
        if (!interaction.inCachedGuild()) return;
        const panel = await Engagement.getRolePanel(panelId);
        if (!panel) return interaction.reply({ content: "This menu is out of date. Ask an admin to re-post the panel.", flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;
        const giveable = (id: string) => {
            const role = interaction.guild.roles.cache.get(id);
            return role && role.editable && !role.managed;
        };
        const panelRoles = panel.roles.map((r) => r.roleId).filter(giveable);
        const picked = new Set(interaction.values.filter((id) => panelRoles.includes(id)));

        const add = [...picked].filter((id) => !member.roles.cache.has(id));
        const remove = panelRoles.filter((id) => !picked.has(id) && member.roles.cache.has(id));
        if (add.length) await member.roles.add(add, "Role panel");
        if (remove.length) await member.roles.remove(remove, "Role panel");

        const parts = [add.length && `added ${add.map((id) => `<@&${id}>`).join(", ")}`, remove.length && `removed ${remove.map((id) => `<@&${id}>`).join(", ")}`].filter(Boolean);
        return interaction.reply({ content: parts.length ? `Done: ${parts.join("; ")}.` : "No changes.", flags: MessageFlags.Ephemeral });
    }
}
