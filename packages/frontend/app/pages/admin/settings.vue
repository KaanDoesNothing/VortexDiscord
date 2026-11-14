<!-- Bot-wide settings: the bot's status message, and commands turned off everywhere (maintenance mode). -->
<template>
    <div v-if="data" class="space-y-6">
        <UiCard title="Status" description="What the bot shows under its name. {servers} and {users} are filled in with live counts.">
            <div class="grid gap-4 sm:grid-cols-[10rem_10rem_1fr]">
                <UiField label="Status">
                    <select v-model="presence.status" class="input">
                        <option value="online">🟢 Online</option>
                        <option value="idle">🌙 Idle</option>
                        <option value="dnd">⛔ Do not disturb</option>
                        <option value="invisible">⚫ Invisible</option>
                    </select>
                </UiField>
                <UiField label="Activity">
                    <select v-model="presence.type" class="input">
                        <option value="Watching">Watching</option>
                        <option value="Playing">Playing</option>
                        <option value="Listening">Listening to</option>
                        <option value="Competing">Competing in</option>
                        <option value="Custom">Custom text</option>
                    </select>
                </UiField>
                <UiField label="Text"><input v-model="presence.text" maxlength="120" class="input" /></UiField>
            </div>
            <p class="text-sm text-zinc-400">Preview: <span class="text-zinc-100">{{ preview }}</span></p>
            <div class="flex justify-end">
                <button type="button" class="btn-primary" :disabled="savingPresence" @click="savePresence">{{ savingPresence ? "Saving…" : "Update status" }}</button>
            </div>
        </UiCard>

        <UiCard title="Disabled everywhere" description="Turn commands off in every server, e.g. while an outside API is down. Owners can still use them.">
            <input v-model="search" type="search" placeholder="Search commands…" class="input sm:w-64" />
            <div class="grid max-h-96 gap-x-6 gap-y-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                <label v-for="c in filtered" :key="c.name" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-800">
                    <input v-model="disabled" type="checkbox" :value="c.name" class="accent-red-500" />
                    <span :class="disabled.includes(c.name) ? 'text-red-300 line-through' : ''">/{{ c.name }}</span>
                    <span class="ml-auto text-xs text-zinc-500">{{ c.category }}</span>
                </label>
            </div>
            <div class="flex items-center justify-between gap-4">
                <span class="text-sm text-zinc-400">{{ disabled.length }} disabled</span>
                <button type="button" class="btn-primary" :disabled="savingCommands || !commandsChanged" @click="saveCommands">{{ savingCommands ? "Saving…" : "Save" }}</button>
            </div>
        </UiCard>
    </div>
    <div v-else class="h-64 animate-pulse rounded-xl bg-zinc-900" />
</template>

<script setup lang="ts">
import type { AdminOverview, PresenceConfig } from "~/types/admin";

const toast = useToast();
const { data, refresh } = await useFetch<AdminOverview>("/api/owner/overview", { server: false });
const { data: commands } = await useCommands();

// ---- Status ----
const presence = reactive<PresenceConfig>({ status: "online", type: "Watching", text: "" });
const savingPresence = ref(false);
watch(data, (d) => d && Object.assign(presence, d.presence), { immediate: true });

const preview = computed(() => {
    const s = data.value?.stats.totals;
    const text = presence.text.replace("{servers}", (s?.guilds ?? 0).toLocaleString()).replace("{users}", (s?.users ?? 0).toLocaleString());
    const verb = { Watching: "Watching ", Playing: "Playing ", Listening: "Listening to ", Competing: "Competing in ", Custom: "" }[presence.type];
    return `${verb}${text}`;
});

async function savePresence() {
    savingPresence.value = true;
    await api("/owner/presence", { method: "PUT", body: { ...presence } }).then(() => toast.show("Status updated"), (e) => toast.show(apiError(e), "error"));
    savingPresence.value = false;
}

// ---- Globally disabled commands ----
const disabled = ref<string[]>([]);
const search = ref("");
const savingCommands = ref(false);
watch(data, (d) => d && (disabled.value = [...d.disabledCommands]), { immediate: true });

const commandsChanged = computed(() => JSON.stringify([...disabled.value].sort()) !== JSON.stringify([...(data.value?.disabledCommands ?? [])].sort()));
const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return (commands.value ?? []).filter((c) => !q || c.name.includes(q) || c.category.toLowerCase().includes(q));
});

async function saveCommands() {
    savingCommands.value = true;
    try {
        await api("/owner/commands", { method: "PUT", body: { disabled: disabled.value } });
        toast.show("Saved");
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    } finally {
        savingCommands.value = false;
    }
}
</script>
