<!-- Server picker: servers the user can manage. Ones without the bot get an invite button. -->
<template>
    <div>
        <h1 class="text-3xl font-bold">Your servers</h1>
        <p class="mt-2 text-zinc-400">Servers where you have the Manage Server permission.</p>

        <div v-if="pending" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-xl bg-zinc-900" />
        </div>

        <p v-else-if="error" class="mt-8 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {{ apiError(error, "Couldn't load your servers.") }}
            <button type="button" class="ml-2 underline" @click="refresh()">Retry</button>
        </p>

        <template v-else>
            <div class="mt-6 flex flex-wrap items-center gap-3">
                <input v-model="search" type="search" placeholder="Search servers…" class="input sm:w-72" />
                <button type="button" class="btn-ghost" @click="refresh()">Refresh</button>
            </div>

            <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <component
                    :is="guild.botPresent ? NuxtLink : 'a'"
                    v-for="guild in filtered"
                    :key="guild.id"
                    v-bind="guild.botPresent ? { to: `/dashboard/${guild.id}` } : { href: inviteUrl(guild.id), target: '_blank', rel: 'noopener' }"
                    class="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                    <img v-if="guild.icon" :src="guild.icon" :alt="guild.name" class="h-14 w-14 rounded-2xl" :class="{ 'opacity-50 grayscale': !guild.botPresent }" />
                    <div v-else class="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-lg font-semibold" :class="{ 'opacity-50': !guild.botPresent }">
                        {{ initials(guild.name) }}
                    </div>
                    <div class="min-w-0">
                        <div class="truncate font-semibold">{{ guild.name }}</div>
                        <div class="text-sm" :class="guild.botPresent ? 'text-brand-400' : 'text-zinc-500'">
                            {{ guild.botPresent ? "Manage →" : "Add bot" }}
                        </div>
                    </div>
                </component>
            </div>

            <p v-if="!filtered.length" class="mt-8 text-center text-zinc-500">
                {{ search ? "No servers match your search." : "You don't manage any servers yet." }}
            </p>
        </template>
    </div>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";
import type { ManageableGuild } from "~/types/dashboard";

definePageMeta({ middleware: "auth" });
useHead({ title: "Dashboard" });

const { data: guilds, pending, error, refresh } = await useFetch<ManageableGuild[]>("/api/auth/guilds", { server: false });
const { data: client } = await useClientInfo();
const search = ref("");

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return (guilds.value ?? []).filter((g) => !q || g.name.toLowerCase().includes(q));
});

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3);

// Invite link that preselects the server. After adding, Discord brings them back to the dashboard.
const inviteUrl = (guildId: string) => {
    const url = new URL("https://discord.com/oauth2/authorize");
    url.search = new URLSearchParams({
        client_id: client.value?.id ?? "",
        scope: "bot applications.commands",
        permissions: "1099793034326",
        guild_id: guildId,
        disable_guild_select: "true"
    }).toString();
    return url.toString();
};
</script>
