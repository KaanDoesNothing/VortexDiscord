import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, PermissionsString, SlashCommandBuilder} from "discord.js";
import {settingsCategoryName} from "./mod";
import {GuildTable} from "../../lib/Database";
import {NoGuildDBEntry} from "../../lib/Language";

export class LevelingCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("leveling")
        .setDescription("Enable or Disable the level system")
        .addStringOption((arg) => arg.setName("choice").setDescription("Enable or Disable").setChoices({name: "Enabled", value: "enabled"}, {name: "Disabled", value: "disabled"}).setRequired(true));

    category = settingsCategoryName;

    userPermissions: PermissionsString[] = ["Administrator"];

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const enabled = (ctx.options.getString("choice") as string) === "enabled";

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});

        guildData.set("settings.economy.experience.enabled", enabled);
        await guildData.save();

        return {content: "Settings have been updated!"};
    }
}