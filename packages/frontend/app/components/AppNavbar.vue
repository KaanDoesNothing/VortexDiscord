<template>
    <header class="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
                <img v-if="client" :src="client.avatar" :alt="client.username" class="h-9 w-9 rounded-full" />
                <div v-else class="h-9 w-9 rounded-full bg-zinc-800" />
                <span class="truncate text-lg font-bold">{{ client?.username ?? "Vortex" }}</span>
            </NuxtLink>

            <div class="flex items-center gap-1">
                <NuxtLink
                    v-for="link in links"
                    :key="link.to"
                    :to="link.to"
                    class="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 sm:block"
                    active-class="bg-zinc-800 text-zinc-100"
                >
                    {{ link.label }}
                </NuxtLink>

                <!-- Logged in: avatar menu. Logged out: login button. Client-only because it depends on the cookie. -->
                <ClientOnly>
                    <details v-if="user" ref="menu" class="relative ml-2">
                        <summary class="flex cursor-pointer list-none items-center gap-2 rounded-full p-0.5 hover:bg-zinc-800">
                            <img :src="user.avatar" :alt="user.displayName" class="h-8 w-8 rounded-full" />
                        </summary>
                        <div class="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl">
                            <div class="truncate px-3 py-2 text-sm text-zinc-400">Signed in as <span class="text-zinc-100">{{ user.displayName }}</span></div>
                            <NuxtLink to="/dashboard" class="block rounded px-3 py-2 text-sm hover:bg-zinc-800" @click="close">Your servers</NuxtLink>
                            <button type="button" class="block w-full rounded px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-800" @click="logout">Log out</button>
                        </div>
                    </details>
                    <NuxtLink v-else to="/login" class="btn-primary ml-2">Log in</NuxtLink>
                </ClientOnly>
            </div>
        </nav>
    </header>
</template>

<script setup lang="ts">
const { data: client } = await useClientInfo();
const { user, fetchUser, logout } = useAuth();
const menu = ref<HTMLDetailsElement>();

const links = [
    { to: "/", label: "Home" },
    { to: "/commands", label: "Commands" },
    { to: "/stats", label: "Stats" },
    { to: "/dashboard", label: "Dashboard" }
];

const close = () => menu.value?.removeAttribute("open");

onMounted(() => fetchUser());
</script>
