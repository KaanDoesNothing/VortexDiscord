<!-- Discord redirects here after login with ?code=&state=. We hand the code to the bot's API, which sets the login cookie. -->
<template>
    <div class="mx-auto max-w-sm py-16 text-center">
        <template v-if="!error">
            <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-brand-500" />
            <p class="mt-4 text-zinc-400">Logging you in…</p>
        </template>
        <template v-else>
            <h1 class="text-xl font-bold">Login failed</h1>
            <p class="mt-2 text-zinc-400">{{ error }}</p>
            <NuxtLink to="/login" class="btn-primary mt-6">Try again</NuxtLink>
        </template>
    </div>
</template>

<script setup lang="ts">
useHead({ title: "Logging in" });

const route = useRoute();
const { completeLogin } = useAuth();
const error = ref("");

onMounted(async () => {
    // The user pressed "Cancel" on Discord's screen.
    if (route.query.error) {
        error.value = "You cancelled the login.";
        return;
    }

    const code = String(route.query.code ?? "");
    const state = String(route.query.state ?? "");
    if (!code) {
        error.value = "Discord didn't send a login code.";
        return;
    }

    try {
        const returnTo = await completeLogin(code, state);
        await navigateTo(returnTo, { replace: true });
    } catch (e) {
        error.value = (e as Error).message && !(e as any).data ? (e as Error).message : apiError(e, "The bot couldn't finish the login.");
    }
});
</script>
