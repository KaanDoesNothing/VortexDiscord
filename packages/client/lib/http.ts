// Small helper for the commands that call public APIs (weather, wiki, crypto, jokes...).
// Adds a timeout, an identifying User-Agent, and a short in-memory cache so popular lookups
// don't hammer free APIs.

const cache = new Map<string, { expires: number; value: unknown }>();
const USER_AGENT = "VortexDiscordBot/1.0 (+https://github.com/discordjs)";

export class ApiError extends Error {}

// Fetches JSON. Throws ApiError with a friendly message on network errors, timeouts and non-2xx.
export async function getJson<T>(url: string, options: { cacheMs?: number; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
    const { cacheMs = 0, headers = {}, timeoutMs = 8000 } = options;

    const hit = cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.value as T;

    let response: Response;
    try {
        response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json", ...headers }, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
        throw new ApiError("The service didn't respond in time. Try again in a moment.");
    }

    if (response.status === 404) throw new ApiError("Nothing found.");
    if (response.status === 429) throw new ApiError("That service is rate-limiting us right now. Try again in a minute.");
    if (!response.ok) throw new ApiError(`The service returned an error (${response.status}).`);

    const value = await response.json() as T;
    if (cacheMs > 0) {
        cache.set(url, { expires: Date.now() + cacheMs, value });
        if (cache.size > 500) cache.delete(cache.keys().next().value!);
    }
    return value;
}

// Reply text for an error thrown by getJson (or anything else).
export const apiErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Something went wrong talking to that service.");

// Trims text to a length, ending on a word boundary.
export const truncate = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);
