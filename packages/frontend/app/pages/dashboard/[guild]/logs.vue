<!-- Command log: every command run in the server, filterable by command. -->
<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <h1 class="text-2xl font-bold">Command log</h1>
            <form class="flex gap-2" @submit.prevent="command = commandInput.trim().toLowerCase()">
                <input v-model="commandInput" type="search" placeholder="Filter by command, e.g. ban" class="input sm:w-56" />
                <button type="submit" class="btn-ghost">Filter</button>
            </form>
        </div>

        <div class="overflow-x-auto rounded-xl border border-zinc-800">
            <table class="w-full text-left text-sm">
                <thead class="bg-zinc-900 text-zinc-400">
                    <tr>
                        <th class="px-4 py-3 font-medium">Command</th>
                        <th class="px-4 py-3 font-medium">User</th>
                        <th class="hidden px-4 py-3 font-medium md:table-cell">Arguments</th>
                        <th class="px-4 py-3 text-right font-medium">When</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    <tr v-if="pending"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                    <tr v-for="row in data?.rows" v-else :key="row.id" class="hover:bg-zinc-900/60">
                        <td class="px-4 py-3 font-mono whitespace-nowrap">
                            <button type="button" class="text-brand-400 hover:underline" @click="commandInput = command = row.command">{{ row.slash ? "/" : "" }}{{ row.command }}</button>
                        </td>
                        <td class="max-w-48 px-4 py-3"><UiUserCell :id="row.userId" :user="data?.users[row.userId]" /></td>
                        <td class="hidden max-w-72 truncate px-4 py-3 font-mono text-xs text-zinc-400 md:table-cell" :title="row.parameters">{{ row.parameters || "—" }}</td>
                        <td class="px-4 py-3 text-right whitespace-nowrap text-zinc-500" :title="new Date(row.createdAt).toLocaleString()">{{ timeAgo(row.createdAt) }}</td>
                    </tr>
                    <tr v-if="!pending && !data?.rows.length"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">No commands logged{{ command ? ` for "${command}"` : "" }}.</td></tr>
                </tbody>
            </table>
        </div>

        <UiPagination v-if="data" v-model:page="page" :limit="data.limit" :total="data.total" />
    </div>
</template>

<script setup lang="ts">
import type { CommandLogRow, Paginated } from "~/types/dashboard";

const { guildId } = useGuildDashboard();
const commandInput = ref("");
const command = ref("");
const page = ref(1);
watch(command, () => (page.value = 1));

const { data, pending } = await useFetch<Paginated<CommandLogRow>>(() => `/api/guilds/${guildId.value}/commandlogs`, {
    query: { page, command },
    server: false
});
</script>
