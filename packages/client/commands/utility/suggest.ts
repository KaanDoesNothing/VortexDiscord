import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Utility } from "../../lib/database";
import { renderSuggestion } from "../../lib/utility";
import { VortexCommand } from "../../lib/structures/command";

// /suggest <idea>: posts a suggestion to the server's suggestion channel with 👍/👎 for voting.
export class SuggestCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["suggestion", "idea"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("Suggest an idea for the server; members vote on it")
        .addStringOption((o) => o.setName("idea").setDescription("Your suggestion").setMaxLength(1500).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { suggestions } = (await DBManager.getGuildConfig(ctx.guildId!)).settings;
        if (!suggestions.enabled || !suggestions.channelId) return ctx.reply({ content: "Suggestions aren't set up on this server.", ephemeral: true });

        const channel = ctx.guild!.channels.cache.get(suggestions.channelId);
        if (!channel?.isSendable()) return ctx.reply({ content: "I can't post in the suggestions channel. Ask an admin to check my permissions.", ephemeral: true });

        const s = await Utility.createSuggestion({ guildId: ctx.guildId!, channelId: channel.id, authorId: ctx.user.id, content: ctx.options.getString("idea", true) });
        const message = await channel.send({ embeds: [renderSuggestion(s, { tag: ctx.user.tag, avatar: ctx.user.displayAvatarURL() })], allowedMentions: { parse: [] } });
        await Utility.setSuggestionMessage(s.id, message.id);
        await message.react("👍").then(() => message.react("👎")).catch(() => null);

        return ctx.reply({ content: `💡 Suggestion #${s.id} posted in ${channel}!`, ephemeral: true });
    }
}
