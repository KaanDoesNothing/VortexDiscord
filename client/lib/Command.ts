import { ApplicationCommandOptionType, ApplicationCommandPartial, SlashCommandInteraction } from "harmony/mod.ts";
import { VortexClient } from "../lib/Client.ts";

export class VortexCommand {
    public client: VortexClient;
    public config: ApplicationCommandPartial;
    public category: string;
    public clientPermissions: string[];
    public userPermissions: string[];
    public usage: {
        slash: string;
        prefix: string;
    }

    constructor(client: VortexClient) {
        this.client = client;

        this.config = {name: "Command"};
        this.category = "None";

        this.clientPermissions = [];
        this.userPermissions = [];

        if(this.initialize) this.initialize();
    }

    initialize(): void {}

    after(): void {
        if(!this.config.options) this.config.options = [];

        this.usage = {
            slash: `${this.config.name} ${this.config.options.map((option) => `[${option.name}]`).join(" ")}`,
            prefix: `${this.config.name} ` + this.config.options.map((option) => {
                if(option.type === ApplicationCommandOptionType.USER) {
                    return `--${option.name} @User`
                }else if(option.type === ApplicationCommandOptionType.STRING) {
                    return `--${option.name}="${option.choices ? option.choices.map(choice => choice.value).join(" | ") : "Text"}"`;
                }else if(option.type === ApplicationCommandOptionType.NUMBER) {
                    return `--${option.name} Number`;
                }
            }).join(" ")
        }
    }

    exec(ctx: SlashCommandInteraction): void | Promise<void> {}
}