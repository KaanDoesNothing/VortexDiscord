import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { Utility } from "../../lib/database";
import { renderSuggestion, type SuggestionStatus } from "../../lib/utility";
import { VortexCommand } from "../../lib/structures/command";

// /review <id> <status> [response]: staff mark a suggestion approved, denied or implemented.
// The original suggestion message is updated and the author gets a DM.
export class ReviewSuggestionCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("review")
        .setDescription("Approve, deny or mark a suggestion as implemented")
        .addIntegerOption((o) => o.setName("id").setDescription("Suggestion number").setRequired(true))
        .addStringOption((o) => o.setName("status").setDescription("New status").setRequired(true).addChoices(
            { name: "Approved", value: "approved" },
            { name: "Denied", value: "denied" },
            { name: "Implemented", value: "implemented" },
            { name: "Open", value: "open" }
        ))
        .addStringOption((o) => o.setName("response").setDescription("A note for the author (optional)").setMaxLength(900));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const id = ctx.options.getInteger("id", true);
        const status = ctx.options.getString("status", true) as SuggestionStatus;
        const response = ctx.options.getString("response");

        const s = await Utility.setSuggestionStatus(ctx.guildId!, id, status, response);
        if (!s) return ctx.reply({ content: `There's no suggestion #${id} here.`, ephemeral: true });

        // Update the posted suggestion.
        const channel = ctx.guild!.channels.cache.get(s.channelId);
        if (channel?.isTextBased() && s.messageId) {
            const message = await channel.messages.fetch(s.messageId).catch(() => null);
            await message?.edit({ embeds: [renderSuggestion(s, message.embeds[0]?.author ? { tag: message.embeds[0].author.name, avatar: message.embeds[0].author.iconURL ?? "" } : undefined)] }).catch(() => null);
        }

        // Let the author know.
        const author = await ctx.client.users.fetch(s.authorId).catch(() => null);
        await author?.send(`Your suggestion #${s.id} in **${ctx.guild!.name}** was marked **${status}**.${response ? `\n> ${response}` : ""}`).catch(() => null);

        return ctx.reply({ content: `Suggestion #${id} is now **${status}**.`, ephemeral: true });
    }
}
