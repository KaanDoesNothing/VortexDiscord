import {VortexExtension} from "../lib/Extension.ts";
import {VortexClient} from "../lib/Client.ts";
import {event} from "harmony/src/client/client.ts";
import {lavaNode} from "../lib/lavalink.ts";

export class rawExtension extends VortexExtension {
    constructor(client: VortexClient) {
        super(client);

        this.name = "raw";
    }

    @event()
    raw(_, e, payload) {
        switch (e) {
            case "VOICE_STATE_UPDATE":
                lavaNode.handleVoiceUpdate(payload);
            case "VOICE_SERVER_UPDATE": {
                lavaNode.handleVoiceUpdate(payload);
            }
        }
    }
}