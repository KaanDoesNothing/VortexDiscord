import {VortexEvent} from "../lib/structures/Event";
import {VortexClient} from "../lib/Client";
import {Interaction, PermissionsBitField, PermissionsString} from "discord.js";
import {ClientMissingPermission, MemberMissingPermission} from "../lib/Language";
import {VortexConfig} from "../config";

export class slashCommandEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "interactionCreate";
    }

    async exec(interaction: Interaction): Promise<void> {
        if(interaction.isChatInputCommand()) {
            await this.client.userDataExists(interaction.user.id);

            const command = this.client.executables.commands.get(interaction.commandName);

            if(command.dev && !VortexConfig.DEV) {
                await interaction.reply("Command is in development and not ready for public use!");
            }

            if(command) {
                try {
                    if(command.userPermissions.length > 0 || command.clientPermissions.length > 0) {
                        const MemberMissingPermissions: PermissionsString[] = [];
                        const ClientMissingPermissions: PermissionsString[] = [];

                        if(!interaction.member) return;

                        command.userPermissions.forEach((permission) => {
                            console.log(interaction.memberPermissions.has(permission));

                            if(!interaction.memberPermissions.has(permission)) MemberMissingPermissions.push(permission);
                        });

                        if(MemberMissingPermissions.length > 0) {
                            await interaction.reply(MemberMissingPermission(MemberMissingPermissions));
                            return;
                        }

                        command.clientPermissions.forEach((permission) => {
                            if(!interaction.guild.members.cache.get(this.client.user.id).permissions.has(permission)) ClientMissingPermissions.push(permission);
                        });

                        if(ClientMissingPermissions.length > 0) {
                            await interaction.reply(ClientMissingPermission(ClientMissingPermissions));
                            return;
                        }
                    }

                    try {
                        const res = await command.exec(interaction);
                        if(typeof res === "object") {
                            await interaction.reply(res);
                        }

                        this.client.statistics.commands.ran++;
                    }catch(err) {
                        console.log(err);
                        await interaction.reply("An error occurred");
                    }
                }catch(err) {
                    console.log(err);
                }
            }
        }
    }
}