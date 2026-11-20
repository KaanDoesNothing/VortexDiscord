import { Events, Listener } from "@sapphire/framework";
import type { VoiceState } from "discord.js";
import { onVoiceUpdate } from "../lib/tempVoice";

// "Join to create" voice channels: see lib/tempVoice.ts.
export class TempVoiceListener extends Listener<typeof Events.VoiceStateUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "TempVoice", event: Events.VoiceStateUpdate });
    }

    public async run(before: VoiceState, after: VoiceState) {
        await onVoiceUpdate(before, after).catch((error) => this.container.logger.debug("Temp voice update failed:", error));
    }
}
