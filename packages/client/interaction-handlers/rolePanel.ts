import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction, GuildMember } from "discord.js";
import { Engagement } from "../lib/database";

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
            return interaction.reply({ content: "This button is out of date. Ask an admin to re-post the panel.", ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role || !role.editable || role.managed) {
            return interaction.reply({ content: "I can't give that role (it's above my highest role, or managed by an integration).", ephemeral: true });
        }

        const member = interaction.member as GuildMember;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId, "Role panel");
            return interaction.reply({ content: `Removed ${role}.`, ephemeral: true });
        }

        // Single mode: drop the panel's other roles first.
        if (panel.mode === "single") {
            const others = panel.roles.map((r) => r.roleId).filter((id) => id !== roleId && member.roles.cache.has(id));
            if (others.length) await member.roles.remove(others, "Role panel (single choice)");
        }

        await member.roles.add(roleId, "Role panel");
        return interaction.reply({ content: `Gave you ${role}.`, ephemeral: true });
    }
}
