import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder, User} from "discord.js";
import {musicCategoryName} from "./mod";
import {NoMusicPlaying} from "../../lib/Language";

const filters = [
    {
        name: "none",
        value: 0
    },
    {
        name: "low",
        value: 0.10
    },
    {
        name: "medium",
        value: 0.15
    },
    {
        name: "high",
        value: 0.25
    }
]

export class BassBoostCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("bassboost")
        .setDescription("Bassboost")
        .addNumberOption((arg) => arg.setName("amount").setDescription("amount").setChoices(...filters.map(filter => {
            return {
                name: filter.name,
                value: filter.value
            }
        })).setRequired(true));

    category = musicCategoryName;
    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const amount = ctx.options.getNumber("amount");

        const player = this.client.music.getPlayer(ctx.guildId);

        if(!player) {
            return {content: NoMusicPlaying};
        }

        const bands = new Array(3)
            .fill(null)
            .map((_, i) =>
                ({ band: i, gain: amount })
            );

        player.shoukaku.setEqualizer(bands);

        return {content: `Preset has been changed to ${filters.filter(filter => filter.value === amount)[0].name}`};
    }
}