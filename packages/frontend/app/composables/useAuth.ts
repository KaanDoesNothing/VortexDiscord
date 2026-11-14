import type { DashboardUser } from "~/types/dashboard";

interface AuthConfig {
    enabled: boolean;
    clientId?: string;
    scopes?: string[];
    redirectUri?: string | null;
}

const STATE_KEY = "vortex:oauth";

// Logged-in user state shared across the app, plus Discord login/logout.
export function useAuth() {
    const user = useState<DashboardUser | null>("auth:user", () => null);
    const loaded = useState("auth:loaded", () => false);

    // Loads the current user once (the cookie is HttpOnly, so we ask the API).
    async function fetchUser(force = false) {
        if (loaded.value && !force) return user.value;

        user.value = await api<DashboardUser>("/auth/me").catch(() => null);
        loaded.value = true;
        return user.value;
    }

    // Sends the browser to Discord's login page. `returnTo` is where to land afterwards.
    async function login(returnTo = "/dashboard") {
        const config = await api<AuthConfig>("/auth/config");
        if (!config.enabled || !config.clientId) throw new Error("Login isn't set up on the bot yet (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET).");

        const redirectUri = config.redirectUri ?? `${location.origin}/oauth/callback`;

        // Random state guards against login CSRF; it's checked in /oauth/callback.
        const state = crypto.randomUUID();
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, returnTo, redirectUri }));

        const url = new URL("https://discord.com/oauth2/authorize");
        url.search = new URLSearchParams({
            client_id: config.clientId,
            response_type: "code",
            scope: (config.scopes ?? ["identify", "guilds"]).join(" "),
            redirect_uri: redirectUri,
            state,
            prompt: "none"
        }).toString();

        location.href = url.toString();
    }

    // Finishes login on /oauth/callback. Returns where to navigate next.
    async function completeLogin(code: string, state: string) {
        const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as { state: string; returnTo: string; redirectUri: string } | null;
        sessionStorage.removeItem(STATE_KEY);

        if (!saved || saved.state !== state) throw new Error("Login expired or was started in another tab. Please try again.");

        await api("/oauth/callback", { method: "POST", body: { code, redirectUri: saved.redirectUri } });
        await fetchUser(true);
        return saved.returnTo;
    }

    async function logout() {
        await api("/oauth/logout", { method: "POST" }).catch(() => null);
        user.value = null;
        await navigateTo("/");
    }

    return { user, loaded, fetchUser, login, completeLogin, logout };
}
