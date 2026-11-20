import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { PermissionFlagsBits, type ButtonInteraction, MessageFlags } from "discord.js";
import { Engagement } from "../lib/database";
import { closePoll, renderPoll } from "../lib/engagement";

// Poll buttons: "poll:<id>:<optionIndex>" votes, "poll:<id>:close" ends the poll
// (only the author or someone with Manage Messages).
export class PollButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        const [kind, id, action] = interaction.customId.split(":");
        if (kind !== "poll" || !id || !action) return this.none();
        return this.some({ id: Number(id), action });
    }

    public async run(interaction: ButtonInteraction, { id, action }: { id: number; action: string }) {
        const poll = await Engagement.getPoll(id);
        if (!poll || poll.closed) return interaction.reply({ content: "This poll has ended.", flags: MessageFlags.Ephemeral });

        if (action === "close") {
            const canClose = interaction.user.id === poll.authorId || interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
            if (!canClose) return interaction.reply({ content: "Only the person who made the poll (or a moderator) can end it.", flags: MessageFlags.Ephemeral });

            await interaction.deferUpdate();
            await closePoll(id);
            return;
        }

        const option = Number(action);
        if (!Number.isInteger(option) || option < 0 || option >= poll.options.length) return interaction.reply({ content: "Unknown option.", flags: MessageFlags.Ephemeral });

        const result = await Engagement.votePoll(id, interaction.user.id, option);
        const counts = await Engagement.pollResults(id, poll.options.length);

        // Update the message in place, then confirm privately.
        await interaction.update(renderPoll(poll, counts));
        await interaction.followUp({
            content: result === "removed" ? "Your vote was removed." : `You voted for **${poll.options[option]}**.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
