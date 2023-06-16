import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {socialCategoryName} from "./mod";

export class BioCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("bio")
        .setDescription("Change your bio")
        .addStringOption((arg) => arg.setName("input").setDescription("your new bio").setRequired(true));

    category = socialCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const input = ctx.options.getString("input");

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        if(!userData) return;

        userData.set("profile.description", input);

        await userData.save();

        await ctx.reply("Your bio has been updated!");
    }
}