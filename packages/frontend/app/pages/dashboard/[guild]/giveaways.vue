<!-- Giveaways: start one, and end or reroll existing ones. -->
<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Giveaways</h1>

        <UiCard title="Start a giveaway">
            <div class="grid gap-4 sm:grid-cols-2">
                <UiField label="Prize"><input v-model="form.prize" maxlength="200" class="input" placeholder="Discord Nitro" /></UiField>
                <UiField label="Channel"><UiChannelSelect v-model="form.channelId" :channels="overview?.channels ?? []" placeholder="Pick a channel…" /></UiField>
                <UiField label="Winners"><input v-model.number="form.winnerCount" type="number" min="1" max="20" class="input" /></UiField>
                <UiField label="Duration">
                    <div class="flex gap-2">
                        <input v-model.number="form.amount" type="number" min="1" class="input" />
                        <select v-model.number="form.unit" class="input w-auto">
                            <option :value="1">minutes</option>
                            <option :value="60">hours</option>
                            <option :value="1440">days</option>
                        </select>
                    </div>
                </UiField>
            </div>
            <div class="flex justify-end">
                <button type="button" class="btn-primary" :disabled="busy || !form.prize || !form.channelId" @click="start">{{ busy ? "Starting…" : "🎉 Start giveaway" }}</button>
            </div>
        </UiCard>

        <UiCard title="Giveaways">
            <div v-if="pending" class="h-20 animate-pulse rounded bg-zinc-900" />
            <p v-else-if="!data?.rows.length" class="py-4 text-center text-sm text-zinc-500">No giveaways yet.</p>
            <ul v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="g in data.rows" :key="g.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                        <div class="font-medium">🎁 {{ g.prize }} <span class="text-xs text-zinc-500">#{{ g.id }}</span></div>
                        <div class="text-sm text-zinc-400">
                            #{{ channelName(g.channelId) ?? "deleted" }} · {{ g.entries }} entries ·
                            <template v-if="g.ended">ended · winners: {{ g.winners.map((w) => data!.users[w]?.username ?? w).join(", ") || "none" }}</template>
                            <template v-else>ends {{ timeAgo(g.endsAt) }}</template>
                        </div>
                    </div>
                    <button v-if="!g.ended" type="button" class="btn-ghost px-3 py-1.5" @click="act(g.id, 'end')">End now</button>
                    <button v-else type="button" class="btn-ghost px-3 py-1.5" @click="act(g.id, 'reroll')">Reroll</button>
                </li>
            </ul>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { GiveawayRow, ResolvedUser } from "~/types/dashboard";

const { guildId, overview, channelName } = useGuildDashboard();
const toast = useToast();
const { data, pending, refresh } = await useFetch<{ rows: GiveawayRow[]; users: Record<string, ResolvedUser> }>(() => `/api/guilds/${guildId.value}/giveaways`, { server: false });

const form = reactive({ prize: "", channelId: null as string | null, winnerCount: 1, amount: 1, unit: 1440 });
const busy = ref(false);

async function start() {
    busy.value = true;
    try {
        await api(`/guilds/${guildId.value}/giveaways`, { method: "POST", body: { prize: form.prize, channelId: form.channelId, winnerCount: form.winnerCount, durationMinutes: form.amount * form.unit } });
        toast.show("Giveaway started");
        form.prize = "";
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    } finally {
        busy.value = false;
    }
}

async function act(id: number, action: "end" | "reroll") {
    await api(`/guilds/${guildId.value}/giveaways/${id}`, { method: "POST", body: { action } })
        .then(() => toast.show(action === "end" ? "Giveaway ended" : "New winners picked"), (e) => toast.show(apiError(e), "error"));
    await refresh();
}
</script>
