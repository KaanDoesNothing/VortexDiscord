import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Engagement } from "../../lib/database";
import { VortexCommand } from "../../lib/structures/command";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// /birthday set|remove|view: your birthday (no year), announced in servers that turned it on.
export class BirthdayCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["bday"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("birthday")
        .setDescription("Set your birthday so servers can celebrate it")
        .addSubcommand((s) => s.setName("set").setDescription("Set your birthday (no year needed)")
            .addIntegerOption((o) => o.setName("month").setDescription("Month").setRequired(true)
                .addChoices(...MONTHS.map((name, i) => ({ name, value: i + 1 }))))
            .addIntegerOption((o) => o.setName("day").setDescription("Day of the month").setMinValue(1).setMaxValue(31).setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Forget your birthday"))
        .addSubcommand((s) => s.setName("view").setDescription("See someone's birthday")
            .addUserOption((o) => o.setName("user").setDescription("Whose birthday (defaults to you)")));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        switch (ctx.options.getSubcommand()) {
            case "set": {
                const month = ctx.options.getInteger("month", true);
                const day = ctx.options.getInteger("day", true);
                if (day > DAYS_IN_MONTH[month - 1]!) return ctx.reply({ content: `${MONTHS[month - 1]} doesn't have ${day} days.`, flags: MessageFlags.Ephemeral });

                await Engagement.setBirthday(ctx.user.id, month, day);
                return ctx.reply({ content: `🎂 Saved! Your birthday is **${MONTHS[month - 1]} ${day}**.`, flags: MessageFlags.Ephemeral });
            }
            case "remove": {
                await Engagement.clearBirthday(ctx.user.id);
                return ctx.reply({ content: "Your birthday has been removed.", flags: MessageFlags.Ephemeral });
            }
            case "view": {
                const user = ctx.options.getUser("user") ?? ctx.user;
                const b = await Engagement.getBirthday(user.id);
                if (!b) return ctx.reply({ content: user.id === ctx.user.id ? "You haven't set your birthday. Use `/birthday set`." : `${user.displayName} hasn't set their birthday.`, flags: MessageFlags.Ephemeral });
                return ctx.reply({ content: `🎂 ${user.id === ctx.user.id ? "Your" : `${user.displayName}'s`} birthday is **${MONTHS[b.month - 1]} ${b.day}**.` });
            }
        }
    }
}
