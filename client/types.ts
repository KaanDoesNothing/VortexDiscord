import { Extension } from "harmony/mod.ts";
import { VortexClient } from "./lib/Client.ts";

export interface VortexExtension extends Extension {
    client: VortexClient
}