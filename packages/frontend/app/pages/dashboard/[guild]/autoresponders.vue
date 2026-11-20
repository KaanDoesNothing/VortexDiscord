<!-- Autoresponders (automatic replies to trigger words), sticky messages and stats channels. -->
<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold">Autoresponders</h1>
                <p class="mt-1 text-sm text-zinc-400">Reply or react automatically when someone says a trigger word. No prefix needed. {{ list?.length ?? 0 }}/50 used.</p>
            </div>
            <button type="button" class="btn-primary" @click="openEditor()">New autoresponder</button>
        </div>

        <div v-if="pending" class="h-32 animate-pulse rounded-xl bg-zinc-900" />
        <div v-else-if="!list?.length" class="rounded-xl border border-dashed border-zinc-800 py-10 text-center text-zinc-400">No autoresponders yet.</div>
        <ul v-else class="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
            <li v-for="a in list" :key="a.id" class="flex flex-wrap items-center gap-4 bg-zinc-900/60 px-4 py-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold" :class="a.enabled ? 'text-brand-400' : 'text-zinc-500 line-through'">{{ a.trigger }}</span>
                        <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">{{ matchLabels[a.match] }}</span>
                        <span v-if="a.reaction" class="text-sm">{{ a.reaction }}</span>
                    </div>
                    <p class="mt-0.5 truncate text-sm text-zinc-400">{{ a.response || "(reaction only)" }}</p>
                </div>
                <span class="text-xs text-zinc-500 tabular-nums">{{ a.uses.toLocaleString() }} uses</span>
                <UiToggle :model-value="a.enabled" :label="`Enable ${a.trigger}`" class="[&>span]:sr-only" @update:model-value="(v) => patch(a, { enabled: v })" />
                <button type="button" class="btn-ghost px-3 py-1.5" @click="openEditor(a)">Edit</button>
                <button type="button" class="btn-danger" @click="remove(a)">Delete</button>
            </li>
        </ul>

        <UiCard title="Sticky messages" description="Messages the bot keeps at the bottom of a channel. Add one in Discord with /sticky set.">
            <p v-if="!extras?.stickies.length" class="text-sm text-zinc-500">None yet.</p>
            <div v-for="s in extras?.stickies" :key="s.channelId" class="flex items-center gap-3 text-sm">
                <span class="text-zinc-400">#{{ channelName(s.channelId) ?? "deleted" }}</span>
                <span class="min-w-0 flex-1 truncate">{{ s.content }}</span>
                <button type="button" class="btn-danger" @click="removeSticky(s.channelId)">Remove</button>
            </div>
        </UiCard>

        <UiCard v-if="statsDraft" title="Stats channels" description="Voice channels whose names show live numbers, updated every 10 minutes. Create one in Discord with /statschannel create, then edit its text here.">
            <div v-for="(s, i) in statsDraft" :key="s.channelId" class="flex items-center gap-2 text-sm">
                <span class="w-40 truncate text-zinc-400">🔊 {{ voiceName(s.channelId) ?? "deleted channel" }}</span>
                <input v-model="s.template" maxlength="100" class="input flex-1 font-mono" />
                <button type="button" class="btn-danger" @click="statsDraft.splice(i, 1)">Stop</button>
            </div>
            <p v-if="!statsDraft.length" class="text-sm text-zinc-500">None yet.</p>
            <p class="text-xs text-zinc-500">
                Placeholders: <code v-for="(desc, token) in overview?.statPlaceholders" :key="token" class="mr-2" :title="desc">{{ token }}</code>
            </p>
            <div v-if="statsDirty" class="flex justify-end gap-2">
                <button type="button" class="btn-ghost" @click="statsReset">Reset</button>
                <button type="button" class="btn-primary" @click="saveStats">Save stats channels</button>
            </div>
        </UiCard>

        <dialog ref="dialog" class="m-auto w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/60" @close="editing = null">
            <form v-if="editing" class="space-y-5 p-6" @submit.prevent="submitEditor">
                <h2 class="text-lg font-semibold">{{ editing.id ? "Edit autoresponder" : "New autoresponder" }}</h2>
                <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <UiField label="Trigger"><input v-model="editing.trigger" required maxlength="200" class="input" placeholder="e.g. how do I join" /></UiField>
                    <UiField label="Match">
                        <select v-model="editing.match" class="input">
                            <option v-for="(label, value) in matchLabels" :key="value" :value="value">{{ label }}</option>
                        </select>
                    </UiField>
                </div>
                <UiField label="Reply" hint="Optional if you set a reaction.">
                    <UiMessageEditor v-model="editing.response" :placeholders="overview?.placeholders ?? {}" :only="['{user}', '{user.name}', '{user.mention}', '{server}', '{memberCount}', '{channel}', '{random:a|b|c}']" :max="2000" :rows="3" />
                </UiField>
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="React with" hint="An emoji (optional)"><input v-model="editing.reaction" maxlength="64" class="input" placeholder="👋" /></UiField>
                    <UiField label="Cooldown per channel (seconds)"><input v-model.number="editing.cooldownSeconds" type="number" min="0" max="86400" class="input" /></UiField>
                </div>
                <UiField label="Only in these channels" hint="Empty = everywhere."><UiMultiPicker v-model="editing.channelIds" :options="channelOptions" noun="channel" :max="50" /></UiField>
                <UiToggle v-model="editing.embed" label="Reply with an embed" />
                <p v-if="editorError" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ editorError }}</p>
                <div class="flex justify-end gap-2">
                    <button type="button" class="btn-ghost" @click="dialog?.close()">Cancel</button>
                    <button type="submit" class="btn-primary" :disabled="busy">{{ busy ? "Saving…" : "Save" }}</button>
                </div>
            </form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import type { Autoresponder, GuildExtras } from "~/types/dashboard";

const { guildId, overview, config, save, channelName } = useGuildDashboard();
const toast = useToast();

const { data: list, pending, refresh } = await useFetch<Autoresponder[]>(() => `/api/guilds/${guildId.value}/autoresponders`, { server: false });
const { data: extras, refresh: refreshExtras } = await useFetch<GuildExtras>(() => `/api/guilds/${guildId.value}/extras`, { server: false });

const matchLabels = { contains: "Contains", word: "Whole word", startsWith: "Starts with", exact: "Exact message" } as const;
const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));
const voiceName = (id: string) => overview.value?.voiceChannels.find((c) => c.id === id)?.name;

type Editing = Omit<Autoresponder, "id" | "uses"> & { id?: number };
const dialog = ref<HTMLDialogElement>();
const editing = ref<Editing | null>(null);
const editorError = ref("");
const busy = ref(false);

function openEditor(a?: Autoresponder) {
    editing.value = a
        ? { id: a.id, trigger: a.trigger, match: a.match, response: a.response, embed: a.embed, reaction: a.reaction, channelIds: [...a.channelIds], cooldownSeconds: a.cooldownSeconds, enabled: a.enabled }
        : { trigger: "", match: "contains", response: "", embed: false, reaction: "", channelIds: [], cooldownSeconds: 10, enabled: true };
    editorError.value = "";
    nextTick(() => dialog.value?.showModal());
}

async function submitEditor() {
    if (!editing.value) return;
    busy.value = true;
    editorError.value = "";
    const { id, ...body } = editing.value;
    try {
        if (id) await api(`/guilds/${guildId.value}/autoresponders/${id}`, { method: "PATCH", body });
        else await api(`/guilds/${guildId.value}/autoresponders`, { method: "POST", body });
        dialog.value?.close();
        toast.show(id ? "Autoresponder updated" : "Autoresponder created");
        await refresh();
    } catch (e) {
        editorError.value = apiError(e);
    } finally {
        busy.value = false;
    }
}

async function patch(a: Autoresponder, body: Partial<Autoresponder>) {
    try {
        await api(`/guilds/${guildId.value}/autoresponders/${a.id}`, { method: "PATCH", body });
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}

async function remove(a: Autoresponder) {
    if (!confirm(`Delete the autoresponder for "${a.trigger}"?`)) return;
    try {
        await api(`/guilds/${guildId.value}/autoresponders/${a.id}`, { method: "DELETE" });
        toast.show("Autoresponder deleted");
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}

async function removeSticky(channelId: string) {
    try {
        await api(`/guilds/${guildId.value}/stickies/${channelId}`, { method: "DELETE" });
        toast.show("Sticky message removed");
        await refreshExtras();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}

// Stats channels live in settings.
const { draft: statsDraft, dirty: statsDirty, reset: statsReset } = useDraft(() => config.value?.settings.statsChannels);
async function saveStats() {
    await save({ settings: { statsChannels: statsDraft.value } }).catch(() => null);
}
</script>
