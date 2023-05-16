import {VortexExtension} from "../lib/Extension.ts";
import {VortexClient} from "../lib/Client.ts";
import {event} from "harmony/src/client/client.ts";
import {ApplicationCommandInteraction} from "harmony/src/structures/applicationCommand.ts";
import {PermissionFlags} from "harmony/src/types/permissionFlags.ts";
import {ClientMissingPermission, MemberMissingPermission} from "../lib/Language.ts";

export class interactionExtension extends VortexExtension {
    constructor(client: VortexClient) {
        super(client);

        this.name = "interaction";
    }

    @event()
    async interactionCreate(_, interaction: ApplicationCommandInteraction) {
        if(interaction.isApplicationCommand()) {
            await this.client.userDataExists(interaction.user.id);

            const command = this.client.executables.commands.get(interaction.data.name);

            if(command) {
                try {
                    if(command.userPermissions.length > 0 || command.clientPermissions.length > 0) {
                        const MemberMissingPermissions: string[] = [];
                        const ClientMissingPermissions: string[] = [];

                        if(!interaction.member) return;

                        command.userPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(!interaction.member?.permissions.has(flag)) MemberMissingPermissions.push(permission);
                        });

                        if(MemberMissingPermissions.length > 0) {
                            interaction.reply(MemberMissingPermission(MemberMissingPermissions));
                            return;
                        }

                        command.clientPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(interaction.member?.permissions.has(flag)) ClientMissingPermissions.push(permission);
                        });

                        if(ClientMissingPermissions.length > 0) {
                            interaction.reply(ClientMissingPermission(ClientMissingPermissions));
                            return;
                        }
                    }

                    await command.exec(interaction);
                    this.client.statistics.commands.ran++;
                }catch(err) {
                    console.log(err);
                }
            }
        }
    }
}