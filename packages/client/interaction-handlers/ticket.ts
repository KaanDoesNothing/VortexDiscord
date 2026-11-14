import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction, GuildMember, TextChannel } from "discord.js";
import { closeTicket, openTicket } from "../lib/utility";

// Ticket buttons: "ticket:open" on the panel posted by /ticket panel, "ticket:close" inside a ticket.
export class TicketButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        if (interaction.customId === "ticket:open" || interaction.customId === "ticket:close") return this.some(interaction.customId.split(":")[1]!);
        return this.none();
    }

    public async run(interaction: ButtonInteraction, action: string) {
        if (!interaction.inCachedGuild()) return;
        const member = interaction.member as GuildMember;

        try {
            if (action === "open") {
                await interaction.deferReply({ ephemeral: true });
                const channel = await openTicket(interaction.guild, member, null);
                return interaction.editReply({ content: `Your ticket is open: ${channel}` });
            }

            await interaction.reply({ content: "Closing…", ephemeral: true });
            await closeTicket(interaction.channel as TextChannel, member);
        } catch (error) {
            const content = (error as Error).message || "Something went wrong.";
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content }).catch(() => null);
            else await interaction.reply({ content, ephemeral: true }).catch(() => null);
        }
    }
}
