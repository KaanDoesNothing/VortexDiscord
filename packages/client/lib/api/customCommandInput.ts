import { container } from "@sapphire/framework";
import { NAME_PATTERN, RESPONSE_MAX } from "../database/customCommands";

export interface CustomCommandInput {
    name?: string;
    response?: string;
    embed?: boolean;
    enabled?: boolean;
}

// Validates a create/update body for custom commands. With partial=true, every field is optional.
export function parseCustomCommandInput(body: unknown, partial: boolean): { input: CustomCommandInput; errors: string[] } {
    const errors: string[] = [];
    const input: CustomCommandInput = {};
    const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

    if (raw.name !== undefined || !partial) {
        const name = typeof raw.name === "string" ? raw.name.trim().toLowerCase() : "";
        if (!NAME_PATTERN.test(name)) errors.push("Name must be 1-32 characters: letters, numbers, - or _");
        // A custom command can't shadow a built-in command or alias.
        else if (container.stores.get("commands").has(name) || container.stores.get("commands").aliases.has(name)) {
            errors.push(`"${name}" is already a built-in command`);
        } else input.name = name;
    }

    if (raw.response !== undefined || !partial) {
        const response = typeof raw.response === "string" ? raw.response : "";
        if (!response.trim() || response.length > RESPONSE_MAX) errors.push(`Response must be 1-${RESPONSE_MAX} characters`);
        else input.response = response;
    }

    if (raw.embed !== undefined) {
        if (typeof raw.embed !== "boolean") errors.push("embed must be true or false");
        else input.embed = raw.embed;
    }

    if (raw.enabled !== undefined) {
        if (typeof raw.enabled !== "boolean") errors.push("enabled must be true or false");
        else input.enabled = raw.enabled;
    }

    return { input, errors };
}
