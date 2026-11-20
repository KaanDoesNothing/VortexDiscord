<!-- Public leaderboard for a server that turned it on (Dashboard → Leveling). Anyone can open it, no login.
     Each page also invites visitors to add the bot to their own server. -->
<template>
    <div class="mx-auto max-w-3xl space-y-8">
        <div v-if="error" class="py-16 text-center">
            <h1 class="text-xl font-bold">Leaderboard not available</h1>
            <p class="mt-2 text-zinc-400">This server doesn't have a public leaderboard (or the bot isn't in it).</p>
        </div>

        <template v-else-if="data">
            <header class="flex items-center gap-4">
                <img v-if="data.guild.icon" :src="data.guild.icon" alt="" class="h-16 w-16 rounded-2xl" />
                <div v-else class="h-16 w-16 rounded-2xl bg-zinc-800" />
                <div class="min-w-0 flex-1">
                    <h1 class="truncate text-2xl font-bold">{{ data.guild.name }}</h1>
                    <p class="text-sm text-zinc-400">Leaderboard · {{ data.guild.memberCount.toLocaleString() }} members</p>
                </div>
            </header>

            <ol class="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
                <li v-for="row in data.rows" :key="row.user.id" class="flex items-center gap-4 bg-zinc-900/60 px-4 py-3">
                    <span class="w-8 text-center font-bold tabular-nums" :style="row.rank <= 3 ? { color: data.accent } : {}">{{ medals[row.rank - 1] ?? row.rank }}</span>
                    <img v-if="row.user.avatar" :src="row.user.avatar" alt="" class="h-10 w-10 rounded-full" />
                    <div class="min-w-0 flex-1">
                        <div class="truncate font-medium">{{ row.user.username }}</div>
                        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                            <div class="h-full rounded-full" :style="{ width: `${Math.round((row.current / row.needed) * 100)}%`, background: data.accent }" />
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold" :style="{ color: data.accent }">Level {{ row.level }}</div>
                        <div class="text-xs text-zinc-500 tabular-nums">{{ row.xp.toLocaleString() }} XP</div>
                    </div>
                </li>
                <li v-if="!data.rows.length" class="px-4 py-8 text-center text-zinc-500">Nobody has earned XP yet.</li>
            </ol>

            <div class="flex justify-center gap-3">
                <button v-if="page > 1" type="button" class="btn-ghost" @click="page--">← Previous</button>
                <button v-if="data.rows.length === data.limit" type="button" class="btn-ghost" @click="page++">Next →</button>
            </div>

            <!-- The growth loop: every shared leaderboard is an ad for the bot. -->
            <section class="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-brand-600/10 p-6 text-center">
                <h2 class="text-lg font-bold">Want this for your server?</h2>
                <p class="mt-1 text-sm text-zinc-400">Leveling, moderation, economy, tickets, music and more. Free, and set up in a minute.</p>
                <div class="mt-4 flex justify-center gap-3">
                    <a :href="data.invite" target="_blank" rel="noopener" class="btn-primary">Add to Discord</a>
                    <NuxtLink to="/" class="btn-ghost">Learn more</NuxtLink>
                </div>
            </section>
        </template>

        <div v-else class="h-96 animate-pulse rounded-xl bg-zinc-900" />
    </div>
</template>

<script setup lang="ts">
interface PublicLeaderboard {
    guild: { id: string; name: string; icon: string | null; memberCount: number };
    accent: string;
    invite: string;
    page: number;
    limit: number;
    rows: { rank: number; user: { id: string; username: string; avatar: string | null }; level: number; xp: number; current: number; needed: number }[];
}

const route = useRoute();
const page = ref(1);
const medals = ["🥇", "🥈", "🥉"];

const { data, error } = await useFetch<PublicLeaderboard>(() => `/api/public/leaderboard/${route.params.guild}`, { query: { page } });

useHead({ title: computed(() => (data.value ? `${data.value.guild.name} leaderboard` : "Leaderboard")) });
useSeoMeta({
    description: computed(() => (data.value ? `The most active members of ${data.value.guild.name}.` : "Server leaderboard")),
    ogTitle: computed(() => (data.value ? `${data.value.guild.name} leaderboard` : "Leaderboard")),
    ogImage: computed(() => data.value?.guild.icon ?? undefined)
});
</script>
