<!-- Leaderboard: members ranked by level, then message count. -->
<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Leaderboard</h1>

        <div class="overflow-hidden rounded-xl border border-zinc-800">
            <table class="w-full text-left text-sm">
                <thead class="bg-zinc-900 text-zinc-400">
                    <tr>
                        <th class="w-16 px-4 py-3 font-medium">#</th>
                        <th class="px-4 py-3 font-medium">Member</th>
                        <th class="px-4 py-3 text-right font-medium">Level</th>
                        <th class="hidden px-4 py-3 text-right font-medium sm:table-cell">Messages</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    <tr v-if="pending"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                    <tr v-for="row in data?.rows" v-else :key="row.userId" class="hover:bg-zinc-900/60">
                        <td class="px-4 py-3 font-semibold tabular-nums" :class="row.rank <= 3 ? 'text-brand-400' : 'text-zinc-500'">{{ row.rank }}</td>
                        <td class="max-w-0 px-4 py-3"><UiUserCell :id="row.userId" :user="data?.users[row.userId]" /></td>
                        <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ row.level }}</td>
                        <td class="hidden px-4 py-3 text-right text-zinc-400 tabular-nums sm:table-cell">{{ row.messages.toLocaleString() }}</td>
                    </tr>
                    <tr v-if="!pending && !data?.rows.length"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">Nobody has leveled up yet.</td></tr>
                </tbody>
            </table>
        </div>

        <UiPagination v-if="data" v-model:page="page" :limit="data.limit" :total="data.total" />
    </div>
</template>

<script setup lang="ts">
import type { LeaderboardRow, Paginated } from "~/types/dashboard";

const { guildId } = useGuildDashboard();
const page = ref(1);

const { data, pending } = await useFetch<Paginated<LeaderboardRow>>(() => `/api/guilds/${guildId.value}/leaderboard`, {
    query: { page },
    server: false
});
</script>
