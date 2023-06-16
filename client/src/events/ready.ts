import {VortexEvent} from "../lib/structures/Event";
import {Events, Routes, SlashCommandBuilder} from "discord.js";
import {VortexClient} from "../lib/Client";
import {rest} from "../index";

export class readyEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "ready";
    }

    async exec(): Promise<void> {
        console.log(`Logged in as ${this.client.user?.tag}!`);

        await this.client.initialize();

        const applicationBody: (SlashCommandBuilder | undefined)[] = [];

        this.client.executables.commands.forEach(({config}) => {
            return applicationBody.push(config as any);
        });

        await rest.put(Routes.applicationCommands(this.client.user!.id), {body: applicationBody});
    }
}