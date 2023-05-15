import { ApplicationCommandPartial, SlashCommandInteraction } from "harmony/mod.ts";
import { VortexClient } from "../lib/Client.ts";

export class VortexCommand {
    public client: VortexClient;
    public config: ApplicationCommandPartial;
    public category: string;
    public clientPermissions: string[];
    public userPermissions: string[];

    constructor(client: VortexClient) {
        this.client = client;

        this.config = {name: "Command"};
        this.category = "None";

        this.clientPermissions = [];
        this.userPermissions = [];

        if(this.initialize) this.initialize();
    }

    initialize(): void {}

    exec(ctx: SlashCommandInteraction): void | Promise<void> {}
}