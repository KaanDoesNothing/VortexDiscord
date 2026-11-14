import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { Engagement } from "../lib/database";
import { renderGiveaway } from "../lib/engagement";

// "🎉 Enter" button on giveaways ("giveaway:<id>"): joins, or leaves if already entered.
export class GiveawayButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        const [kind, id] = interaction.customId.split(":");
        if (kind !== "giveaway" || !id) return this.none();
        return this.some(Number(id));
    }

    public async run(interaction: ButtonInteraction, id: number) {
        const result = await Engagement.toggleGiveawayEntry(id, interaction.user.id);
        if (result.state === "ended") return interaction.reply({ content: "This giveaway has ended.", ephemeral: true });

        await interaction.reply({
            content: result.state === "joined" ? "🎉 You're entered! Good luck." : "You left the giveaway.",
            ephemeral: true
        });

        // Refresh the entry count on the message.
        const g = await Engagement.getGiveaway(id);
        if (g) await interaction.message.edit(renderGiveaway(g)).catch(() => null);
    }
}
