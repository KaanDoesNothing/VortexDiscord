import { Extension } from "harmony/mod.ts";
import { VortexClient } from "./Client.ts";

export class VortexExtension extends Extension {
    declare client: VortexClient;
}