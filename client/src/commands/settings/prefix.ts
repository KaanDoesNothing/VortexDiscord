import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {settingsCategoryName} from "./mod";
import {GuildTable} from "../../lib/Database";
import {NoGuildDBEntry} from "../../lib/Language";

export class PrefixCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("prefix")
        .setDescription("Change server prefix")
        .addStringOption((arg) => arg.setName("input").setDescription("New prefix").setRequired(true));

    category = settingsCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const prefix = ctx.options.getString("input");

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
        if(!guildData) return {content: NoGuildDBEntry};

        guildData.set("settings.prefix", prefix);

        await guildData.save();

        return {content: "Settings have been updated!"};
    }
}