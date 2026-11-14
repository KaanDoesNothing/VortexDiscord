import type { GuildSettings } from "~/types/dashboard";

// Shortcut for dashboard pages that edit one part of the settings, e.g. useSettingsSection("starboard").
// Returns a draft of that section, dirty tracking, and save/reset wired to the API.
export function useSettingsSection<K extends keyof GuildSettings>(key: K) {
    const { overview, config, save } = useGuildDashboard();
    const { draft, dirty, reset } = useDraft(() => config.value?.settings[key]);
    const saving = ref(false);

    async function submit() {
        if (draft.value === undefined) return;
        saving.value = true;
        await save({ settings: { [key]: draft.value } as never }).catch(() => null);
        saving.value = false;
    }

    return { overview, draft, dirty, reset, saving, submit };
}
