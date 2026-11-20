import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { Cooldowns } from "../../lib/cooldowns";
import { linkButtons } from "../../lib/links";
import { VortexCommand } from "../../lib/structures/command";
import { Colors, fail, ok, VortexEmbed } from "../../lib/structures/embed";

const cooldowns = new Cooldowns();

// /feedback <message>: sends a suggestion or bug report to the bot's developers (FEEDBACK_CHANNEL_ID).
// Listening to the people who use the bot is the cheapest way to keep servers around.
export class FeedbackCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["bug", "suggestbot"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("feedback")
        .setDescription("Send an idea or bug report to the bot's developers")
        .addStringOption((o) => o.setName("message").setDescription("What's on your mind").setMinLength(10).setMaxLength(1500).setRequired(true))
        .addStringOption((o) => o.setName("type").setDescription("What kind of feedback").addChoices({ name: "Idea", value: "idea" }, { name: "Bug", value: "bug" }, { name: "Other", value: "other" }));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const channelId = Bun.env.FEEDBACK_CHANNEL_ID;
        const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
        if (!channel?.isSendable()) return ctx.reply({ ...fail("Feedback isn't set up for this bot yet."), components: linkButtons(ctx.client, ["support"]) });
        if (!cooldowns.take(ctx.user.id, 10 * 60_000)) return ctx.reply(fail("You can send feedback once every 10 minutes."));

        const type = ctx.options.getString("type") ?? "other";
        await channel.send({
            embeds: [new VortexEmbed(null)
                .setColor(type === "bug" ? Colors.danger : type === "idea" ? Colors.success : Colors.brand)
                .setTitle(type === "bug" ? "🐛 Bug report" : type === "idea" ? "💡 Idea" : "💬 Feedback")
                .setDescription(ctx.options.getString("message", true))
                .setAuthor({ name: `${ctx.user.tag} (${ctx.user.id})`, iconURL: ctx.user.displayAvatarURL() })
                .setFooter({ text: ctx.guild ? `${ctx.guild.name} (${ctx.guild.id}) · ${ctx.guild.memberCount} members` : "Direct message" })
                .setTimestamp()],
            allowedMentions: { parse: [] }
        });
        return ctx.reply({ ...ok("Thanks! Your feedback was sent to the developers.", true), components: linkButtons(ctx.client, ["support"]) });
    }
}
