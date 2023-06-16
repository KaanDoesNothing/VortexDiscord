import {
    ApplicationCommandOptionType, CommandInteraction,
    CommandInteractionOption,
    Interaction,
    SlashCommandBuilder,
    User
} from "discord.js";
import { VortexClient } from "./Client";
// import {client} from "../index.ts";

// import {GuildTable, GuildUserTable} from "./Database.ts";
//
// import handlebars from "https://esm.sh/handlebars@4.7.7";
// import {VortexEmbed} from "./Embed.ts";

export class VortexCommand {
    public client: VortexClient;
    public config?: SlashCommandBuilder;
    public category: string;
    public clientPermissions: string[];
    public userPermissions: string[];
    public usage?: {
        slash: string;
        prefix: string;
    }
    public hidden: boolean;

    constructor(client: VortexClient) {
        this.client = client;

        this.category = "None";
        this.hidden = false;

        this.clientPermissions = [];
        this.userPermissions = [];


        if(this.initialize) this.initialize();
    }

    initialize(): void {}

    // after(): void {
    //     if(!this.config.options) this.config.options = [];
    //
    //     this.usage = {
    //         slash: `${this.config.name} ${this.config.options.map((option) => `[${option.name}]`).join(" ")}`,
    //         prefix: `${this.config.name} ` + this.config.options.map((option) => {
    //             if(option.type === ApplicationCommandOptionType.USER) {
    //                 return `--${option.name} @User`
    //             }else if(option.type === ApplicationCommandOptionType.STRING) {
    //                 return `--${option.name}="${option.choices ? option.choices.map(choice => choice.value).join(" | ") : "Text"}"`;
    //             }else if(option.type === ApplicationCommandOptionType.NUMBER) {
    //                 return `--${option.name} Number`;
    //             }
    //         }).join(" ")
    //     }
    // }

    exec(ctx: CommandInteraction): void | Promise<void> {}
}

// export class CustomCommand {
//     private guild_id: string;
//     private author: User;
//     private target: User;
//
//     setGuild(guild_id: string) {
//         this.guild_id = guild_id;
//
//         return this;
//     }
//
//     setAuthor(user: User) {
//         this.author = user;
//
//         return this;
//     }
//
//     setTarget(user: User) {
//         this.target = user;
//     }
//
//     async parse(custom: string) {
//         const guild = await client.guilds.get(this.guild_id);
//
//         let dataToPass = {
//             // client,
//             guild: {
//                 id: guild.id,
//                 name: guild.name,
//                 settings: (await GuildTable.findOne({guild_id: guild.id})).settings
//             },
//             author: {
//                 username: this.author.username,
//                 settings: (await GuildUserTable.findOne({guild_id: guild.id, user_id: this.author.id})).toJSON()
//             }
//         }
//
//         const workerData = await (new Promise((resolve, reject) => {
//             const worker = new Worker(new URL("./custom/command_worker.ts", import.meta.url), {type: "module"});
//             worker.postMessage( JSON.stringify({template: custom, templateData: dataToPass}));
//             worker.onmessage = (e) => resolve(JSON.parse(e.data));
//         }));
//
//         return workerData.actions;
//     }
// }