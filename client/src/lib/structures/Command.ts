import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction, InteractionReplyOptions,
    PermissionsString,
    SlashCommandBuilder
} from "discord.js";
import {BaseClass} from "./base";

export class VortexCommand extends BaseClass {
    public usage?: {
        slash: string;
        prefix: string;
    }

    public config?: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    public category: string = "None";
    public clientPermissions?: PermissionsString[] = [];
    public userPermissions?: PermissionsString[] = [];
    public hidden: boolean = false;
    public dev: boolean = false;

    public checks: Function[] = [];

    constructor() {
        super();
        if(this.initialize) this.initialize();
    }

    initialize(): void {}

    exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> | InteractionReplyOptions | void {};
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