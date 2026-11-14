import { capitalizeFirstLetter } from "@sapphire/utilities";
import { ApplicationCommandOptionType, type Client } from "discord.js";
import type { Command } from "@sapphire/framework";
import type { VortexCommand } from "../structures/command";

export interface SerializedCommandOption {
    name: string;
    description: string;
    type: string;
    required: boolean;
    choices?: { name: string; value: string | number }[];
}

export interface SerializedCommand {
    name: string;
    category: string;
    description: string;
    permissionLevel: number;
}

export interface SerializedCommandDetails extends SerializedCommand {
    options: SerializedCommandOption[];
}

/** The short form used in command lists. */
export function serializeCommand(command: Command): SerializedCommand {
    const vortex = command as VortexCommand;

    return {
        name: command.name,
        category: capitalizeFirstLetter(command.category ?? "general"),
        description: vortex.applicationCommandData?.description ?? command.description ?? "",
        permissionLevel: vortex.permission_level ?? 0
    };
}

/** The full form, including the slash command options. */
export function serializeCommandDetails(command: Command): SerializedCommandDetails {
    const data = (command as VortexCommand).applicationCommandData?.toJSON();

    const options = (data?.options ?? []).map((option) => ({
        name: option.name,
        description: option.description,
        type: ApplicationCommandOptionType[option.type],
        required: "required" in option ? Boolean(option.required) : false,
        choices: "choices" in option && option.choices
            ? option.choices.map(({ name, value }) => ({ name, value }))
            : undefined
    }));

    return { ...serializeCommand(command), options };
}

export function serializeClient(client: Client<true>) {
    return {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL({ size: 256, extension: "webp" })
    };
}
