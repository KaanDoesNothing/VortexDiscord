import {ChatInputCommandInteraction} from "discord.js";
import {VortexClient} from "../Client";

export const isInVoiceChannel = ({ctx, client}: {ctx: ChatInputCommandInteraction, client: VortexClient}) => {
    if(!ctx.guild.members.cache.get(ctx.user.id).voice.channel) return {content: "You must be in a voice channel"};
}