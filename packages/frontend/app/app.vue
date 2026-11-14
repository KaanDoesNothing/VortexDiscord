<template>
    <div class="flex min-h-screen flex-col">
        <NuxtLoadingIndicator color="#6d6af0" />
        <AppNavbar />
        <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
            <NuxtPage />
        </main>
        <footer class="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
            {{ client?.username ?? "Vortex" }} &middot; {{ new Date().getFullYear() }}
        </footer>
        <UiToaster />
    </div>
</template>

<script setup lang="ts">
const { data: client } = await useClientInfo();

// Page titles look like "Commands · Vortex"; the favicon is the bot's avatar.
useHead({
    titleTemplate: (title) => {
        const name = client.value?.username ?? "Vortex";
        return title ? `${title} · ${name}` : name;
    },
    link: computed(() => client.value ? [{ rel: "icon", type: "image/webp", href: client.value.avatar }] : [])
});
</script>
