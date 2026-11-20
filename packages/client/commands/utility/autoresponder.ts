import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type AutocompleteInteraction } from "discord.js";
import { createAutoresponder, deleteAutoresponder, listAutoresponders, MAX_AUTORESPONDERS } from "../../lib/autoresponders";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

// /autoresponder add|remove|list: automatic replies to trigger words. More options (embeds,
// reactions, channels, cooldowns) are in the dashboard (Utility → Autoresponders).
export class AutoresponderCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["ar"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("autoresponder")
        .setDescription("Reply automatically when someone says a trigger word (admins)")
        .addSubcommand((s) => s.setName("add").setDescription("Add an automatic reply")
            .addStringOption((o) => o.setName("trigger").setDescription("Word or phrase to react to").setMaxLength(200).setRequired(true))
            .addStringOption((o) => o.setName("response").setDescription("What to reply (placeholders like {user.mention} work)").setMaxLength(2000).setRequired(true))
            .addStringOption((o) => o.setName("match").setDescription("How the trigger must match (default: contains)").addChoices(
                { name: "Message contains it", value: "contains" },
                { name: "Whole word only", value: "word" },
                { name: "Message starts with it", value: "startsWith" },
                { name: "Message is exactly it", value: "exact" }
            )))
        .addSubcommand((s) => s.setName("remove").setDescription("Remove an automatic reply")
            .addStringOption((o) => o.setName("trigger").setDescription("Which one").setRequired(true).setAutocomplete(true)))
        .addSubcommand((s) => s.setName("list").setDescription("All automatic replies on this server"));

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const query = interaction.options.getFocused().toLowerCase();
        const list = await listAutoresponders(interaction.guildId!);
        return interaction.respond(list.filter((a) => a.trigger.toLowerCase().includes(query)).slice(0, 25).map((a) => ({ name: a.trigger.slice(0, 100), value: String(a.id) })));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const list = await listAutoresponders(guildId);

        switch (ctx.options.getSubcommand()) {
            case "add": {
                if (list.length >= MAX_AUTORESPONDERS) return ctx.reply(fail(`A server can have at most ${MAX_AUTORESPONDERS} autoresponders.`));
                const trigger = ctx.options.getString("trigger", true).trim();
                if (list.some((a) => a.trigger.toLowerCase() === trigger.toLowerCase())) return ctx.reply(fail("There's already an autoresponder with that trigger."));
                await createAutoresponder(guildId, {
                    trigger,
                    response: ctx.options.getString("response", true),
                    match: ctx.options.getString("match") ?? "contains",
                    embed: false,
                    reaction: "",
                    channelIds: [],
                    cooldownSeconds: 10,
                    enabled: true
                }, ctx.user.id);
                return ctx.reply(ok(`Added an autoresponder for **${trigger}**.`));
            }
            case "remove": {
                const input = ctx.options.getString("trigger", true);
                const target = list.find((a) => String(a.id) === input || a.trigger.toLowerCase() === input.toLowerCase());
                if (!target) return ctx.reply(fail("There's no autoresponder with that trigger."));
                await deleteAutoresponder(guildId, target.id);
                return ctx.reply(ok(`Removed the autoresponder for **${target.trigger}**.`));
            }
            default: {
                const embed = new VortexEmbed().setTitle("💬 Autoresponders")
                    .setDescription(list.map((a) => `${a.enabled ? "🟢" : "⚫"} **${a.trigger}** (${a.match}) → ${a.response.slice(0, 80) || a.reaction}${a.response.length > 80 ? "…" : ""}`).join("\n").slice(0, 4000) || "None yet. Add one with `/autoresponder add`.");
                return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
            }
        }
    }
}
