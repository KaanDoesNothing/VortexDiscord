import type { GuildConfig, GuildOverview, GuildSettings } from "~/types/dashboard";

// Deep-partial so pages can save a single section, e.g. { leveling: { enabled: false } }.
type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface SettingsPatch {
    prefix?: string;
    disabledCommands?: string[];
    settings?: DeepPartial<GuildSettings>;
}

// Shared state for one server's dashboard: loaded once by the [guild] layout page,
// then read and saved by each section page.
export function useGuildDashboard() {
    const route = useRoute();
    const guildId = computed(() => String(route.params.guild));

    const overview = useState<GuildOverview | null>("dashboard:overview", () => null);
    const error = useState<{ status: number; message: string } | null>("dashboard:error", () => null);
    const loading = useState("dashboard:loading", () => false);

    async function load(force = false) {
        if (!force && overview.value?.guild.id === guildId.value) return;

        loading.value = true;
        error.value = null;
        try {
            overview.value = await api<GuildOverview>(`/guilds/${guildId.value}`);
        } catch (e: any) {
            overview.value = null;
            error.value = { status: e?.statusCode ?? 500, message: apiError(e, "Couldn't load this server") };
        } finally {
            loading.value = false;
        }
    }

    // Saves settings and updates local state with what the API stored. Throws with the API's message.
    async function save(patch: SettingsPatch) {
        try {
            const config = await api<GuildConfig>(`/guilds/${guildId.value}/settings`, { method: "PATCH", body: patch });
            if (overview.value) overview.value.config = config;
            useToast().show("Saved");
            return config;
        } catch (e) {
            const message = apiError(e, "Couldn't save");
            useToast().show(message, "error");
            throw new Error(message);
        }
    }

    const config = computed(() => overview.value?.config);
    const channelName = (id: string | null) => overview.value?.channels.find((c) => c.id === id)?.name;

    return { guildId, overview, config, error, loading, load, save, channelName };
}
