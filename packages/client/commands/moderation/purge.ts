import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

// /purge <amount> [user]: bulk-deletes recent messages, optionally only from one user.
// Discord can't bulk-delete messages older than 14 days; those are skipped.
export class PurgeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["ManageMessages", "ReadMessageHistory"],
            requiredUserPermissions: ["ManageMessages"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Bulk-delete up to 100 recent messages in this channel")
        .addIntegerOption((arg) => arg.setName("amount").setDescription("How many (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
        .addUserOption((arg) => arg.setName("user").setDescription("Only delete messages from this user"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const amount = ctx.options.getInteger("amount", true);
        const user = ctx.options.getUser("user");
        const channel = ctx.channel;

        if (!channel || !("bulkDelete" in channel)) return ctx.reply({ content: "I can't purge messages here.", ephemeral: true });

        await ctx.deferReply({ ephemeral: true });

        // For prefix usage, also remove the "->purge" message itself.
        const isPrefix = (ctx as unknown as { isPollyFilled?: boolean }).isPollyFilled;

        let messages = await channel.messages.fetch({ limit: 100 });
        if (isPrefix) messages = messages.filter((m) => m.id !== ctx.id);
        if (user) messages = messages.filter((m) => m.author.id === user.id);

        const toDelete = [...messages.values()].slice(0, amount);
        const deleted = await channel.bulkDelete(toDelete, true);

        if (isPrefix) await channel.messages.delete(ctx.id).catch(() => null);

        const skipped = toDelete.length - deleted.size;
        const reply = await ctx.editReply(`Deleted ${deleted.size} message${deleted.size === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} older than 14 days.` : ""}`);

        // Prefix replies aren't ephemeral, so clean them up after a moment.
        if (isPrefix) setTimeout(() => (reply as { delete?: () => Promise<unknown> }).delete?.().catch(() => null), 3000);
    }
}
