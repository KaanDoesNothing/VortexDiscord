<!-- Layout for one server: loads its data once, shows the sidebar, and renders the section page. -->
<template>
    <div>
        <!-- Loading -->
        <div v-if="loading && !overview" class="flex gap-8">
            <div class="hidden w-56 shrink-0 space-y-2 md:block">
                <div v-for="i in 8" :key="i" class="h-9 animate-pulse rounded-lg bg-zinc-900" />
            </div>
            <div class="h-96 flex-1 animate-pulse rounded-xl bg-zinc-900" />
        </div>

        <!-- Error (no access, bot not in server, API down) -->
        <div v-else-if="error" class="mx-auto max-w-md py-16 text-center">
            <h1 class="text-xl font-bold">{{ error.status === 403 ? "No access" : error.status === 404 ? "Bot not in this server" : "Couldn't load server" }}</h1>
            <p class="mt-2 text-zinc-400">{{ error.message }}</p>
            <div class="mt-6 flex justify-center gap-3">
                <NuxtLink to="/dashboard" class="btn-ghost">Back to servers</NuxtLink>
                <button type="button" class="btn-primary" @click="load(true)">Retry</button>
            </div>
        </div>

        <div v-else-if="overview" class="flex flex-col gap-8 md:flex-row">
            <aside class="md:w-56 md:shrink-0">
                <div class="mb-4 flex items-center gap-3">
                    <img v-if="overview.guild.icon" :src="overview.guild.icon" alt="" class="h-10 w-10 rounded-xl" />
                    <div v-else class="h-10 w-10 rounded-xl bg-zinc-800" />
                    <div class="min-w-0">
                        <div class="truncate font-semibold">{{ overview.guild.name }}</div>
                        <NuxtLink to="/dashboard" class="text-xs text-zinc-500 hover:text-zinc-300">← All servers</NuxtLink>
                    </div>
                </div>

                <nav class="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
                    <template v-for="group in nav" :key="group.title">
                        <div class="hidden px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase md:block">{{ group.title }}</div>
                        <NuxtLink
                            v-for="item in group.items"
                            :key="item.to"
                            :to="`/dashboard/${guildId}${item.to}`"
                            class="shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
                            :exact-active-class="'bg-zinc-800 text-zinc-100'"
                        >
                            {{ item.label }}
                        </NuxtLink>
                    </template>
                </nav>
            </aside>

            <div class="min-w-0 flex-1">
                <NuxtPage />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { guildId, overview, error, loading, load } = useGuildDashboard();

useHead({ title: computed(() => overview.value?.guild.name ?? "Dashboard") });

// Sidebar sections. Each maps to a page in pages/dashboard/[guild]/.
const nav = [
    { title: "Server", items: [
        { to: "", label: "Overview" },
        { to: "/general", label: "General" },
        { to: "/audit", label: "Audit log" }
    ] },
    { title: "Commands", items: [
        { to: "/commands", label: "Commands" },
        { to: "/custom-commands", label: "Custom commands" }
    ] },
    { title: "Moderation", items: [
        { to: "/automod", label: "Auto-mod" },
        { to: "/moderation", label: "Mod log & punishments" },
        { to: "/event-logs", label: "Event logs" },
        { to: "/logs", label: "Command log" }
    ] },
    { title: "Engagement", items: [
        { to: "/leveling", label: "Leveling" },
        { to: "/leaderboard", label: "Leaderboard" },
        { to: "/welcome", label: "Welcome & roles" },
        { to: "/role-panels", label: "Role panels" },
        { to: "/starboard", label: "Starboard" },
        { to: "/giveaways", label: "Giveaways" },
        { to: "/birthdays", label: "Birthdays" },
        { to: "/economy", label: "Economy" }
    ] },
    { title: "Utility", items: [
        { to: "/tickets", label: "Tickets" },
        { to: "/suggestions", label: "Suggestions" },
        { to: "/announcements", label: "Announcements" },
        { to: "/embed", label: "Embed builder" }
    ] }
];

// Load on enter and whenever the user switches servers.
watch(guildId, () => load(), { immediate: true });
</script>
