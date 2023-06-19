import {VortexEvent} from "../lib/structures/Event";
import {Routes, SlashCommandBuilder} from "discord.js";
import {rest} from "../index";

export class readyEvent extends VortexEvent {
    type = "ready";

    async exec(): Promise<void> {
        console.log(`Logged in as ${this.client.user?.tag}!`);

        await this.client.initialize();

        const applicationBody: (SlashCommandBuilder | undefined)[] = [];

        this.client.executables.commands.forEach(({config}) => {
            return applicationBody.push(config as any);
        });

        await rest.put(Routes.applicationCommands(this.client.user!.id), {body: applicationBody});

        this.client.user.setPresence({activities: [{name: `/announcement, (Important) ${this.client.guilds.cache.size} Servers`, url: `https://www.twitch.tv/${this.client.user.username}`, type: 1}]});
    }
}