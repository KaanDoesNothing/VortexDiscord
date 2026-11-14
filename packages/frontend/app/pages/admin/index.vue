<!-- Admin overview: headline numbers, shard health, usage, system, and quick status of bot-wide settings. -->
<template>
    <div v-if="data" class="space-y-6">
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div v-for="t in tiles" :key="t.label" class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div class="text-sm text-zinc-400">{{ t.label }}</div>
                <div class="mt-1 text-2xl font-bold tabular-nums">{{ t.value }}</div>
            </div>
        </div>

        <!-- Things worth knowing at a glance. -->
        <div class="flex flex-wrap gap-3 text-sm">
            <span class="rounded-full border border-zinc-800 px-3 py-1" :class="data.membersIntent ? 'text-emerald-300' : 'text-amber-300'">
                Server Members intent: {{ data.membersIntent ? "on" : "off" }}
            </span>
            <span class="rounded-full border border-zinc-800 px-3 py-1" :class="data.disabledCommands.length ? 'text-amber-300' : 'text-zinc-400'">
                {{ data.disabledCommands.length ? `${data.disabledCommands.length} command(s) disabled globally` : "No commands disabled globally" }}
            </span>
            <span class="rounded-full border border-zinc-800 px-3 py-1 text-zinc-400">Status: {{ data.presence.type }} "{{ data.presence.text }}"</span>
            <span class="rounded-full border border-zinc-800 px-3 py-1 text-zinc-400">{{ data.owners.length }} owner(s)</span>
        </div>

        <UiCard title="Commands used" description="Last 24 hours, per hour">
            <ChartsUsageChart :data="data.stats.usage.hourly.map((h) => ({ day: h.hour, uses: h.uses }))" unit="hour" />
        </UiCard>

        <div class="grid gap-6 lg:grid-cols-2">
            <UiCard title="Shards">
                <div class="-m-5 overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="text-zinc-400">
                            <tr class="border-b border-zinc-800">
                                <th class="px-5 py-3 font-medium">Shard</th>
                                <th class="px-5 py-3 font-medium">Status</th>
                                <th class="px-5 py-3 text-right font-medium">Ping</th>
                                <th class="px-5 py-3 text-right font-medium">Servers</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-800">
                            <tr v-for="s in data.stats.shards" :key="s.id">
                                <td class="px-5 py-3 font-mono">#{{ s.id }}</td>
                                <td class="px-5 py-3"><span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" :class="s.status === 'Ready' ? 'bg-emerald-400' : 'bg-amber-400'" />{{ s.status }}</span></td>
                                <td class="px-5 py-3 text-right tabular-nums">{{ s.ping >= 0 ? `${s.ping}ms` : "—" }}</td>
                                <td class="px-5 py-3 text-right tabular-nums">{{ s.guilds.toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UiCard>

            <UiCard title="Top commands" description="Last 30 days">
                <ChartsRankedBars :items="data.stats.usage.topCommands.map((c) => ({ label: `/${c.command}`, value: c.uses }))" />
            </UiCard>
        </div>

        <UiCard title="System">
            <dl class="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div v-for="row in system" :key="row.label" class="flex justify-between gap-4"><dt class="text-zinc-400">{{ row.label }}</dt><dd class="tabular-nums">{{ row.value }}</dd></div>
            </dl>
        </UiCard>

        <div class="flex justify-end"><button type="button" class="btn-ghost" @click="refresh()">Refresh</button></div>
    </div>

    <p v-else-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{{ apiError(error, "Couldn't load the overview.") }}</p>
    <div v-else class="h-64 animate-pulse rounded-xl bg-zinc-900" />
</template>

<script setup lang="ts">
import type { AdminOverview } from "~/types/admin";

const { data, error, refresh } = await useFetch<AdminOverview>("/api/owner/overview", { server: false });

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const duration = (ms: number) => {
    const d = Math.floor(ms / 86_400_000), h = Math.floor(ms / 3_600_000) % 24, m = Math.floor(ms / 60_000) % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

const tiles = computed(() => {
    const s = data.value!.stats;
    return [
        { label: "Servers", value: s.totals.guilds.toLocaleString() },
        { label: "Users", value: compact(s.totals.users) },
        { label: "Used (24h)", value: s.usage.last24h.toLocaleString() },
        { label: "Uptime", value: duration(s.bot.uptimeMs) },
        { label: "Ping", value: `${s.totals.ping}ms` },
        { label: "Memory", value: `${s.system.memoryMb} MB` }
    ];
});

const system = computed(() => {
    const s = data.value!.stats;
    return [
        { label: "Heap", value: `${s.system.heapMb} MB` },
        { label: "CPUs", value: s.system.cpuCount },
        { label: "Load (1m)", value: s.system.loadAverage.toFixed(2) },
        { label: "Platform", value: s.system.platform },
        { label: "Runtime", value: s.system.runtime },
        { label: "Library", value: s.system.library },
        { label: "Players", value: s.economy.users.toLocaleString() },
        { label: "Coins in circulation", value: compact(s.economy.coinsInCirculation) }
    ];
});
</script>
