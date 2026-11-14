<!-- Suggestions: where /suggest posts, plus reviewing suggestions (approve / deny / implemented). -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Suggestions</h1>
            <p class="mt-1 text-sm text-zinc-400">Members post ideas with <code>/suggest</code>; everyone votes with 👍 / 👎. Review them here or with <code>/review</code>.</p>
        </div>

        <template v-if="draft">
            <UiCard>
                <UiToggle v-model="draft.enabled" label="Enable suggestions" />
                <UiField v-if="draft.enabled" label="Suggestions channel"><UiChannelSelect v-model="draft.channelId" :channels="overview!.channels" placeholder="Pick a channel…" /></UiField>
            </UiCard>
            <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
        </template>

        <UiCard title="Review">
            <template #action>
                <select v-model="status" class="input w-auto py-1.5">
                    <option value="">All</option>
                    <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
            </template>
            <p v-if="!list?.rows.length" class="py-4 text-center text-sm text-zinc-500">No suggestions.</p>
            <ul v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="s in list.rows" :key="s.id" class="space-y-2 px-5 py-4">
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-zinc-500">#{{ s.id }}</span>
                        <UiUserCell :id="s.authorId" :user="list.users[s.authorId]" />
                        <span class="text-zinc-500">· {{ timeAgo(s.createdAt) }}</span>
                        <span class="ml-auto rounded px-2 py-0.5 text-xs font-medium" :class="badge[s.status]">{{ s.status }}</span>
                    </div>
                    <p class="text-sm whitespace-pre-wrap text-zinc-200">{{ s.content }}</p>
                    <p v-if="s.response" class="border-l-2 border-zinc-700 pl-3 text-sm text-zinc-400">{{ s.response }}</p>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="st in statuses.filter((x) => x.value !== s.status)" :key="st.value" type="button" class="btn-ghost px-3 py-1 text-xs" @click="review(s.id, st.value)">{{ st.label }}</button>
                    </div>
                </li>
            </ul>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { ResolvedUser, Suggestion } from "~/types/dashboard";

const { guildId, overview, draft, dirty, reset, saving, submit } = { ...useGuildDashboard(), ...useSettingsSection("suggestions") };
const toast = useToast();

const statuses = [
    { value: "open", label: "Open" }, { value: "approved", label: "✅ Approve" },
    { value: "denied", label: "❌ Deny" }, { value: "implemented", label: "🚀 Implemented" }
] as const;
const badge: Record<string, string> = {
    open: "bg-brand-500/20 text-brand-400", approved: "bg-emerald-950 text-emerald-300",
    denied: "bg-red-950 text-red-300", implemented: "bg-amber-950 text-amber-300"
};

const status = ref("");
const { data: list, refresh } = await useFetch<{ rows: Suggestion[]; users: Record<string, ResolvedUser> }>(() => `/api/guilds/${guildId.value}/suggestions`, { query: { status }, server: false });

async function review(id: number, newStatus: string) {
    const response = newStatus === "open" ? null : prompt("Optional note for the author (leave empty for none):");
    await api(`/guilds/${guildId.value}/suggestions/${id}`, { method: "PATCH", body: { status: newStatus, response: response || null } })
        .then(() => toast.show("Suggestion updated"), (e) => toast.show(apiError(e), "error"));
    await refresh();
}
</script>
