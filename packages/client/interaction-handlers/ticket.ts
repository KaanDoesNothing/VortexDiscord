import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction, type GuildMember, type ModalSubmitInteraction, type StringSelectMenuInteraction, type TextChannel } from "discord.js";
import { DBManager } from "../lib/database";
import { fail } from "../lib/structures/embed";
import { closeTicket, openTicket, ticketForm, toggleClaim } from "../lib/utility";

// Runs a ticket action and turns thrown errors (no permission, limit reached...) into a private reply.
async function guarded(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction, action: () => Promise<unknown>) {
    try {
        await action();
    } catch (error) {
        const message = (error as Error).message || "Something went wrong.";
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message }).catch(() => null);
        else await interaction.reply(fail(message)).catch(() => null);
    }
}

async function open(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction, options: Parameters<typeof openTicket>[2]) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = await openTicket(interaction.guild!, interaction.member as GuildMember, options);
    await interaction.editReply({ content: `🎫 Your ticket is open: ${channel}` });
}

// Buttons: "ticket:open" on a panel without types, "ticket:claim" and "ticket:close" inside a ticket.
export class TicketButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        const [kind, action] = interaction.customId.split(":");
        return kind === "ticket" && ["open", "claim", "close"].includes(action ?? "") ? this.some(action!) : this.none();
    }

    public async run(interaction: ButtonInteraction, action: string) {
        if (!interaction.inCachedGuild()) return;
        const member = interaction.member as GuildMember;
        const channel = interaction.channel as TextChannel;

        await guarded(interaction, async () => {
            if (action === "open") return open(interaction, {});
            if (action === "claim") {
                const result = await toggleClaim(channel, member);
                await interaction.update({ components: [result.controls] });
                await channel.send({ content: result.claimed ? `🙋 ${member} is handling this ticket.` : `${member} unclaimed this ticket.`, allowedMentions: { parse: [] } });
                return;
            }
            await interaction.reply({ content: "Closing…", flags: MessageFlags.Ephemeral });
            await closeTicket(channel, member);
        });
    }
}

// The ticket type menu on a panel ("ticket:type"). Types with questions show a form first.
export class TicketTypeMenuHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, name: "TicketTypeMenu", interactionHandlerType: InteractionHandlerTypes.SelectMenu });
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId === "ticket:type" ? this.some(Number(interaction.values[0])) : this.none();
    }

    public async run(interaction: StringSelectMenuInteraction, typeIndex: number) {
        if (!interaction.inCachedGuild()) return;
        const { tickets } = (await DBManager.getGuildConfig(interaction.guildId)).settings;
        const type = tickets.types[typeIndex];
        if (!type) return interaction.reply(fail("That ticket type doesn't exist anymore. Ask staff to re-post the panel."));
        if (type.questions.length) return interaction.showModal(ticketForm(typeIndex, type));
        await guarded(interaction, () => open(interaction, { typeIndex }));
    }
}

// The question form ("ticket:form:<typeIndex>"): answers are posted in the new ticket.
export class TicketFormHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, name: "TicketForm", interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
    }

    public override parse(interaction: ModalSubmitInteraction) {
        const [kind, part, index] = interaction.customId.split(":");
        return kind === "ticket" && part === "form" ? this.some(Number(index)) : this.none();
    }

    public async run(interaction: ModalSubmitInteraction, typeIndex: number) {
        if (!interaction.inCachedGuild()) return;
        const { tickets } = (await DBManager.getGuildConfig(interaction.guildId)).settings;
        const type = tickets.types[typeIndex];
        const answers = (type?.questions ?? []).map((question, i) => ({ question, answer: interaction.fields.getTextInputValue(`q${i}`) }));
        await guarded(interaction, () => open(interaction, { typeIndex, answers }));
    }
}
