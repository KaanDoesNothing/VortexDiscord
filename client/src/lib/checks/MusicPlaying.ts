import {ChatInputCommandInteraction} from "discord.js";
import {VortexClient} from "../Client";
import {NoMusicPlaying} from "../Language";

export const isMusicPlaying = ({ctx, client}: {ctx: ChatInputCommandInteraction, client: VortexClient}) => {
    const player = client.music.getPlayer(ctx.guildId);
    if(!player) return {content: NoMusicPlaying};
}