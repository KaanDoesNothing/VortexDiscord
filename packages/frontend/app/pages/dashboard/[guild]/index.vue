<!-- Overview: headline numbers, usage over the last 14 days, top commands, and mod actions. -->
<template>
    <div v-if="overview" class="space-y-6">
        <div class="flex items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold">Overview</h1>
                <p class="mt-1 text-sm text-zinc-400">Server created {{ new Date(overview.guild.createdAt).toLocaleDateString() }}</p>
            </div>
            <button type="button" class="btn-ghost" @click="load(true)">Refresh</button>
        </div>

        <!-- Headline numbers -->
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div v-for="stat in tiles" :key="stat.label" class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div class="text-sm text-zinc-400">{{ stat.label }}</div>
                <div class="mt-1 text-2xl font-bold tabular-nums">{{ stat.value.toLocaleString() }}</div>
                <div v-if="stat.sub" class="mt-0.5 text-xs text-zinc-500">{{ stat.sub }}</div>
            </div>
        </div>

        <UiCard title="Commands used" description="Last 14 days (UTC)">
            <ChartsUsageChart :data="overview.stats.usageByDay" />
        </UiCard>

        <UiCard title="Member growth" description="Joins and leaves, last 30 days (UTC)">
            <ChartsGrowthChart v-if="growth?.tracking" :data="growth.days" />
            <p v-else class="py-6 text-center text-sm text-zinc-500">
                Growth tracking needs the Server Members intent. See the README (step 5) to turn it on.
            </p>
        </UiCard>

        <div class="grid gap-6 lg:grid-cols-2">
            <UiCard title="Top commands" description="Last 30 days">
                <ChartsRankedBars :items="overview.stats.topCommands.map((c) => ({ label: c.command, value: c.uses }))" empty="No commands used in the last 30 days" />
            </UiCard>

            <UiCard title="Mod actions" description="All time">
                <ChartsRankedBars :items="overview.stats.modActionsByType.map((m) => ({ label: m.type, value: m.total }))" empty="No moderation actions yet" />
                <template #action>
                    <NuxtLink :to="`/dashboard/${guildId}/moderation`" class="text-sm text-brand-400 hover:underline">View log →</NuxtLink>
                </template>
            </UiCard>
        </div>

        <!-- Quick status of the main features, linking to their settings. -->
        <UiCard title="Features">
            <ul class="grid gap-3 sm:grid-cols-2">
                <li v-for="feature in features" :key="feature.label">
                    <NuxtLink :to="`/dashboard/${guildId}${feature.to}`" class="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 hover:bg-zinc-900">
                        <span class="text-sm">{{ feature.label }}</span>
                        <span class="flex items-center gap-1.5 text-xs" :class="feature.on ? 'text-emerald-400' : 'text-zinc-500'">
                            <span class="h-2 w-2 rounded-full" :class="feature.on ? 'bg-emerald-400' : 'bg-zinc-600'" />
                            {{ feature.on ? "On" : "Off" }}
                        </span>
                    </NuxtLink>
                </li>
            </ul>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
const { guildId, overview, load } = useGuildDashboard();
const { data: growth } = await useFetch<{ days: { day: string; joins: number; leaves: number }[]; tracking: boolean }>(() => `/api/guilds/${guildId.value}/growth`, { server: false });

const tiles = computed(() => {
    const o = overview.value!;
    return [
        { label: "Members", value: o.guild.memberCount, sub: `${o.guild.textChannels} text · ${o.guild.voiceChannels} voice channels` },
        { label: "Commands (7 days)", value: o.stats.commands7d, sub: `${o.stats.commandsTotal.toLocaleString()} all time` },
        { label: "Active users (30 days)", value: o.stats.activeUsers30d, sub: "Ran at least one command" },
        { label: "Mod actions", value: o.stats.modActionsTotal, sub: "All time" }
    ];
});

const features = computed(() => {
    const s = overview.value!.config.settings;
    return [
        { label: "Leveling", on: s.leveling.enabled, to: "/leveling" },
        { label: "Level-up announcements", on: s.leveling.enabled && s.leveling.announce, to: "/leveling" },
        { label: "Welcome messages", on: s.welcome.enabled, to: "/welcome" },
        { label: "Goodbye messages", on: s.goodbye.enabled, to: "/welcome" },
        { label: "Auto-roles", on: s.autoRoleIds.length > 0, to: "/welcome" },
        { label: "Mod log channel", on: s.modLog.enabled && !!s.modLog.channelId, to: "/moderation" }
    ];
});
</script>
