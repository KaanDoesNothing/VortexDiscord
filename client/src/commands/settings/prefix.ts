import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {settingsCategoryName} from "./mod";
import {GuildTable} from "../../lib/Database";

export class PrefixCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("prefix")
        .setDescription("Change server prefix")
        .addStringOption((arg) => arg.setName("input").setDescription("New prefix").setRequired(true));

    category = settingsCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const prefix = ctx.options.getString("input");

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
        if(!guildData) return;

        guildData.set("settings.prefix", prefix);

        await guildData.save();

        await ctx.reply("Settings have been updated!");
    }
}