<!-- Admin panel layout (bot owners only): tab navigation + the active section. -->
<template>
    <div>
        <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold">Admin panel</h1>
                <p class="mt-1 text-sm text-zinc-400">Bot-wide controls. Only bot owners can see this page.</p>
            </div>
        </div>

        <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800">
            <NuxtLink
                v-for="tab in tabs"
                :key="tab.to"
                :to="`/admin${tab.to}`"
                class="-mb-px shrink-0 border-b-2 border-transparent px-4 py-2.5 text-sm whitespace-nowrap text-zinc-400 transition hover:text-zinc-100"
                exact-active-class="!border-brand-500 !text-zinc-100"
            >
                {{ tab.label }}
            </NuxtLink>
        </nav>

        <NuxtPage />
    </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "owner" });
useHead({ title: "Admin" });

const tabs = [
    { to: "", label: "Overview" },
    { to: "/servers", label: "Servers" },
    { to: "/users", label: "Users" },
    { to: "/blacklist", label: "Blacklist" },
    { to: "/settings", label: "Bot settings" }
];
</script>
