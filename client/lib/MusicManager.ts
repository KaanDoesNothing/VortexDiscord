

// import "npm:@discordjs/collection";
// import { Manager, VoiceState, VoicePacket, VoiceServer } from "npm:erela.jshyper";

// import { VortexClient } from "./Client.ts";

// export class musicManager {
//     public client: VortexClient;
//     public players: Array<string>;
//     public manager: Manager;

//     constructor(client: VortexClient) {
//         this.client = client;
//         this.players = [];

//         this.manager = new Manager({
//             nodes: [

//                 { secure: false, version: "v3", useVersionPath: true, requestTimeout: 1, retryAmount: 10, host: "", port: 2333, password: "" }
//             ],
//             send(id: any, payload: any) {
//                 console.log(payload)
//                 const shard = client.shards.get(client.shard);
//                 shard.send(payload);
//             }
//         });

//         this.launchEvents();
//     }

//     launchEvents() {
//         this.manager.on("nodeConnect", (node) => console.log(`${node.options.identifier} has been connected.`));
//         this.manager.on("nodeError", (node, error) => console.log(`${node.options.identifier} had an error: ${error.message}`));

//         this.manager.on("trackStart", async (player, track) => {
//             const channel: any = await this.client.channels.get(player.textChannel as any);

//             channel.send({content: `Now playing: ${track.title}`});
//         });

//         this.manager.on("trackEnd", async (player) => {
//             const channel: any = await this.client.channels.get(player.textChannel as any);

//             channel.send({content: `Track has ended.`});
//         });

//         this.manager.on("queueEnd", async (player) => {
//             const channel: any = await this.client.channels.get(player.textChannel as any);

//             channel.send({content: `Queue has ended.`});

//             player.destroy();
//         });

//         this.manager.on("playerDestroy", async (player) => {
//             const channel: any = await this.client.channels.get(player.textChannel as any);

//             channel.send({content: `Leaving the voice channel.`});
//         });

        
//         this.client.on("raw", (e, d) => {
//             switch (d.t) {
//                 case "VOICE_SERVER_UPDATE":
//                 case "VOICE_STATE_UPDATE":
//                   this.manager.updateVoiceState(d.d as VoiceState | VoiceServer | VoicePacket)
//                 break;
//               }
//         });
//     }
// }