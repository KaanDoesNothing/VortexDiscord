// Data fetching for the public pages (home, commands). Requests go to /api, which the
// Nuxt server proxies to the bot (see server/api/[...path].ts).

export interface ClientInfo {
    id: string;
    username: string;
    avatar: string;
}

export interface Statistics {
    guilds: number;
    users: number;
    channels: number;
    commands: number;
}

export interface CommandInfo {
    name: string;
    category: string;
    description: string;
}

// SSR-friendly fetch (useFetch) against the bot's API.
export function useApi<T>(path: string) {
    return useFetch<T>(path, { baseURL: "/api", key: `api:${path}` });
}

// Imperative fetch for actions (saving, deleting). Throws on non-2xx; read the API's message with apiError().
export const api = $fetch.create({ baseURL: "/api" });

// Pulls the API's { error } message out of a failed request.
export function apiError(error: unknown, fallback = "Something went wrong") {
    const data = (error as { data?: { error?: string } })?.data;
    return data?.error ?? fallback;
}

export const useClientInfo = () => useApi<ClientInfo>("/information/client");
export const useStatistics = () => useApi<Statistics>("/information/statistics");
export const useCommands = () => useApi<CommandInfo[]>("/commands");
