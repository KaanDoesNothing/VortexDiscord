<!-- Public stats: totals, uptime, per-shard status, command usage over 24h, top commands, system info. Refreshes every 30s. -->
<template>
    <div class="space-y-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold">Stats</h1>
                <p class="mt-1 text-zinc-400">Live numbers from the bot. Updates every 30 seconds.</p>
            </div>
            <span v-if="stats" class="flex items-center gap-2 text-sm text-emerald-400"><span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Online for {{ duration(stats.bot.uptimeMs) }}</span>
        </div>

        <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">Couldn't reach the bot. It may be restarting.</p>

        <template v-if="stats">
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div v-for="t in tiles" :key="t.label" class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div class="text-sm text-zinc-400">{{ t.label }}</div>
                    <div class="mt-1 text-2xl font-bold tabular-nums">{{ t.value }}</div>
                </div>
            </div>

            <UiCard title="Commands used" description="Last 24 hours, per hour">
                <ChartsUsageChart :data="stats.usage.hourly.map((h) => ({ day: h.hour, uses: h.uses }))" unit="hour" />
            </UiCard>

            <div class="grid gap-6 lg:grid-cols-2">
                <UiCard title="Shards" :description="`${stats.shards.length} shard${stats.shards.length === 1 ? '' : 's'} · each handles a slice of servers`">
                    <div class="-m-5 overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="text-zinc-400">
                                <tr class="border-b border-zinc-800">
                                    <th class="px-5 py-3 font-medium">Shard</th>
                                    <th class="px-5 py-3 font-medium">Status</th>
                                    <th class="px-5 py-3 text-right font-medium">Ping</th>
                                    <th class="px-5 py-3 text-right font-medium">Servers</th>
                                    <th class="px-5 py-3 text-right font-medium">Users</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-800">
                                <tr v-for="s in stats.shards" :key="s.id">
                                    <td class="px-5 py-3 font-mono">#{{ s.id }}</td>
                                    <td class="px-5 py-3">
                                        <!-- Status always has a text label, not just a color dot. -->
                                        <span class="inline-flex items-center gap-1.5">
                                            <span class="h-2 w-2 rounded-full" :class="s.status === 'Ready' ? 'bg-emerald-400' : 'bg-amber-400'" />
                                            {{ s.status }}
                                        </span>
                                    </td>
                                    <td class="px-5 py-3 text-right tabular-nums" :class="s.ping > 300 ? 'text-amber-300' : ''">{{ s.ping >= 0 ? `${s.ping}ms` : "—" }}</td>
                                    <td class="px-5 py-3 text-right tabular-nums">{{ s.guilds.toLocaleString() }}</td>
                                    <td class="px-5 py-3 text-right tabular-nums">{{ s.users.toLocaleString() }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </UiCard>

                <UiCard title="Top commands" description="Last 30 days">
                    <ChartsRankedBars :items="stats.usage.topCommands.map((c) => ({ label: `/${c.command}`, value: c.uses }))" />
                </UiCard>
            </div>

            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <UiCard v-if="stats.music?.configured" title="Music">
                    <dl class="space-y-2 text-sm">
                        <div class="flex justify-between"><dt class="text-zinc-400">Listening now</dt><dd class="tabular-nums">{{ stats.music.playing.toLocaleString() }} server{{ stats.music.playing === 1 ? "" : "s" }}</dd></div>
                        <div v-for="n in stats.music.nodes" :key="n.id" class="flex justify-between">
                            <dt class="text-zinc-400">{{ n.type }} node</dt>
                            <dd class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" :class="n.connected ? 'bg-emerald-400' : 'bg-red-400'" />{{ n.connected ? "Online" : "Offline" }}</dd>
                        </div>
                    </dl>
                </UiCard>
                <UiCard title="Economy">
                    <dl class="space-y-2 text-sm">
                        <div class="flex justify-between"><dt class="text-zinc-400">Players</dt><dd class="tabular-nums">{{ stats.economy.users.toLocaleString() }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-400">Coins in circulation</dt><dd class="tabular-nums">{{ compact(stats.economy.coinsInCirculation) }}</dd></div>
                    </dl>
                </UiCard>
                <UiCard title="Leveling">
                    <dl class="space-y-2 text-sm">
                        <div class="flex justify-between"><dt class="text-zinc-400">Members tracked</dt><dd class="tabular-nums">{{ compact(stats.leveling.members) }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-400">Messages counted</dt><dd class="tabular-nums">{{ compact(stats.leveling.messagesCounted) }}</dd></div>
                    </dl>
                </UiCard>
                <UiCard title="System">
                    <dl class="space-y-2 text-sm">
                        <div class="flex justify-between"><dt class="text-zinc-400">Memory</dt><dd class="tabular-nums">{{ stats.system.memoryMb }} MB</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-400">Runtime</dt><dd>{{ stats.system.runtime }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-400">Library</dt><dd>{{ stats.system.library }}</dd></div>
                    </dl>
                </UiCard>
            </div>
        </template>

        <div v-else-if="!error" class="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div v-for="i in 6" :key="i" class="h-20 animate-pulse rounded-xl bg-zinc-900" />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { BotStats } from "~/types/dashboard";

useHead({ title: "Stats" });

const { data: stats, error, refresh } = await useFetch<BotStats>("/api/information/stats");

// Keep it live while the page is open.
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (timer = setInterval(() => refresh(), 30_000)));
onBeforeUnmount(() => clearInterval(timer));

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const duration = (ms: number) => {
    const d = Math.floor(ms / 86_400_000), h = Math.floor(ms / 3_600_000) % 24, m = Math.floor(ms / 60_000) % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

const tiles = computed(() => {
    const s = stats.value!;
    return [
        { label: "Servers", value: s.totals.guilds.toLocaleString() },
        { label: "Users", value: compact(s.totals.users) },
        { label: "Commands", value: s.totals.commands.toString() },
        { label: "Used (24h)", value: s.usage.last24h.toLocaleString() },
        { label: "Shards", value: s.totals.shards.toString() },
        { label: "Ping", value: `${s.totals.ping}ms` }
    ];
});
</script>
