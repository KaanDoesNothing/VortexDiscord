<!-- Audit log: who changed what in the dashboard (or via /settings), and when. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Audit log</h1>
            <p class="mt-1 text-sm text-zinc-400">Every change made to this server's bot settings.</p>
        </div>

        <div class="overflow-hidden rounded-xl border border-zinc-800">
            <table class="w-full text-left text-sm">
                <thead class="bg-zinc-900 text-zinc-400">
                    <tr>
                        <th class="px-4 py-3 font-medium">Who</th>
                        <th class="px-4 py-3 font-medium">What</th>
                        <th class="hidden px-4 py-3 font-medium md:table-cell">Details</th>
                        <th class="px-4 py-3 text-right font-medium">When</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    <tr v-if="pending"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                    <tr v-for="row in data?.rows" v-else :key="row.id" class="hover:bg-zinc-900/60">
                        <td class="max-w-48 px-4 py-3"><UiUserCell :id="row.userId" :user="data?.users[row.userId]" /></td>
                        <td class="px-4 py-3">{{ describe(row.action) }}</td>
                        <td class="hidden max-w-80 truncate px-4 py-3 font-mono text-xs text-zinc-500 md:table-cell" :title="JSON.stringify(row.details)">{{ details(row.details) }}</td>
                        <td class="px-4 py-3 text-right whitespace-nowrap text-zinc-500" :title="new Date(row.createdAt).toLocaleString()">{{ timeAgo(row.createdAt) }}</td>
                    </tr>
                    <tr v-if="!pending && !data?.rows.length"><td colspan="4" class="px-4 py-8 text-center text-zinc-500">No changes recorded yet.</td></tr>
                </tbody>
            </table>
        </div>

        <UiPagination v-if="data" v-model:page="page" :limit="data.limit" :total="data.total" />
    </div>
</template>

<script setup lang="ts">
import type { AuditRow, Paginated } from "~/types/dashboard";

const { guildId } = useGuildDashboard();
const page = ref(1);
const { data, pending } = await useFetch<Paginated<AuditRow>>(() => `/api/guilds/${guildId.value}/audit`, { query: { page }, server: false });

const LABELS: Record<string, string> = {
    "settings.update": "Changed settings",
    "customCommand.create": "Created a custom command",
    "customCommand.update": "Edited a custom command",
    "customCommand.delete": "Deleted a custom command",
    "rolePanel.create": "Created a role panel",
    "rolePanel.update": "Edited a role panel",
    "rolePanel.delete": "Deleted a role panel",
    "giveaway.start": "Started a giveaway",
    "giveaway.end": "Ended a giveaway",
    "giveaway.reroll": "Rerolled a giveaway",
    "announcement.create": "Scheduled an announcement",
    "announcement.delete": "Deleted an announcement",
    "message.send": "Sent a message",
    "suggestion.review": "Reviewed a suggestion"
};
const describe = (action: string) => LABELS[action] ?? action;
const details = (d: Record<string, unknown>) => Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ");
</script>
