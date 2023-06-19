import {VortexEvent} from "../lib/structures/Event";
import {Interaction, PermissionsString} from "discord.js";
import {ClientMissingPermission, MemberMissingPermission} from "../lib/Language";
import {VortexConfig} from "../config";
import {CommandHandler} from "../lib/CommandHandler";

export class slashCommandEvent extends VortexEvent {
    type = "interactionCreate";

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

                    await new CommandHandler(command).setClient(this.client).exec(interaction);
                }catch(err) {
                    console.log(err);
                }
            }
        }
    }
}