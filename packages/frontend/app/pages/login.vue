<template>
    <div class="mx-auto max-w-sm py-16 text-center">
        <h1 class="text-2xl font-bold">Log in to the dashboard</h1>
        <p class="mt-2 text-zinc-400">Sign in with Discord to manage the servers where you have the <b>Manage Server</b> permission.</p>

        <button type="button" class="btn-primary mt-8 w-full py-3" :disabled="busy" @click="start">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.1-.8-9.6-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" /></svg>
            {{ busy ? "Redirecting…" : "Continue with Discord" }}
        </button>

        <p v-if="error" class="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">
useHead({ title: "Log in" });

const route = useRoute();
const { login, fetchUser } = useAuth();
const busy = ref(false);
const error = ref("");

// Only allow returning to pages on this site.
const returnTo = computed(() => {
    const target = String(route.query.redirect ?? "/dashboard");
    return target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
});

// Already logged in? Skip straight to where they were going.
onMounted(async () => {
    if (await fetchUser()) navigateTo(returnTo.value);
});

async function start() {
    busy.value = true;
    error.value = "";
    try {
        await login(returnTo.value);
    } catch (e) {
        error.value = (e as Error).message || apiError(e);
        busy.value = false;
    }
}
</script>
