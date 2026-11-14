<!-- Scheduled announcements: send a message later, once or on repeat. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Announcements</h1>
            <p class="mt-1 text-sm text-zinc-400">Schedule a message for later, or repeat it (e.g. weekly rules reminder).</p>
        </div>

        <UiCard title="New announcement">
            <UiMessageComposer v-model="draft" :channels="overview?.channels ?? []" />
            <div class="grid gap-4 sm:grid-cols-2">
                <UiField label="Send at" hint="Your local time."><input v-model="runAt" type="datetime-local" class="input" /></UiField>
                <UiField label="Repeat">
                    <select v-model.number="repeat" class="input">
                        <option :value="0">Don't repeat</option>
                        <option :value="60">Every hour</option>
                        <option :value="1440">Every day</option>
                        <option :value="10080">Every week</option>
                        <option :value="43200">Every 30 days</option>
                    </select>
                </UiField>
            </div>
            <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ error }}</p>
            <div class="flex justify-end">
                <button type="button" class="btn-primary" :disabled="busy" @click="create">{{ busy ? "Scheduling…" : "Schedule" }}</button>
            </div>
        </UiCard>

        <UiCard title="Scheduled">
            <p v-if="!list?.length" class="py-4 text-center text-sm text-zinc-500">Nothing scheduled.</p>
            <ul v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="a in list" :key="a.id" class="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <div class="min-w-0 flex-1">
                        <div class="truncate font-medium">{{ a.embed?.title || a.content || "(embed)" }}</div>
                        <div class="text-zinc-400">#{{ channelName(a.channelId) ?? "deleted" }} · next {{ new Date(a.runAt).toLocaleString() }}{{ a.repeatMinutes ? ` · repeats every ${describe(a.repeatMinutes)}` : "" }}</div>
                    </div>
                    <button type="button" class="btn-danger" @click="remove(a.id)">Delete</button>
                </li>
            </ul>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { Announcement, MessageDraft } from "~/types/dashboard";

const { guildId, overview, channelName } = useGuildDashboard();
const toast = useToast();
const { data: list, refresh } = await useFetch<Announcement[]>(() => `/api/guilds/${guildId.value}/announcements`, { server: false });

const draft = ref<MessageDraft>({ channelId: "", content: "", embed: null });
// Default: one hour from now, formatted for datetime-local in the user's timezone.
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const runAt = ref(toLocalInput(new Date(Date.now() + 3_600_000)));
const repeat = ref(0);
const busy = ref(false);
const error = ref("");

const describe = (m: number) => (m % 10080 === 0 ? `${m / 10080} week(s)` : m % 1440 === 0 ? `${m / 1440} day(s)` : `${m / 60} hour(s)`);

async function create() {
    busy.value = true;
    error.value = "";
    try {
        await api(`/guilds/${guildId.value}/announcements`, { method: "POST", body: { ...draft.value, runAt: new Date(runAt.value).toISOString(), repeatMinutes: repeat.value || null } });
        toast.show("Announcement scheduled");
        draft.value = { channelId: draft.value.channelId, content: "", embed: null };
        await refresh();
    } catch (e) {
        error.value = apiError(e);
    } finally {
        busy.value = false;
    }
}

async function remove(id: number) {
    if (!confirm("Delete this scheduled announcement?")) return;
    await api(`/guilds/${guildId.value}/announcements/${id}`, { method: "DELETE" }).then(() => toast.show("Deleted"), (e) => toast.show(apiError(e), "error"));
    await refresh();
}
</script>
