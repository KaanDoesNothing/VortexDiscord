<!-- Embed builder: compose a message with a live preview and send it as the bot. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Embed builder</h1>
            <p class="mt-1 text-sm text-zinc-400">Write a message or a styled embed and post it as the bot, great for rules and announcements.</p>
        </div>

        <UiCard>
            <UiMessageComposer v-model="draft" :channels="overview?.channels ?? []" />
            <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ error }}</p>
            <div class="flex items-center justify-end gap-3">
                <a v-if="lastUrl" :href="lastUrl" target="_blank" rel="noopener" class="text-sm text-brand-400 hover:underline">View sent message →</a>
                <button type="button" class="btn-primary" :disabled="busy" @click="send">{{ busy ? "Sending…" : "Send now" }}</button>
            </div>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { MessageDraft } from "~/types/dashboard";

const { guildId, overview } = useGuildDashboard();
const toast = useToast();

const draft = ref<MessageDraft>({ channelId: "", content: "", embed: { title: "", description: "", color: "#6d6af0", image: "", footer: "" } });
const busy = ref(false);
const error = ref("");
const lastUrl = ref("");

async function send() {
    busy.value = true;
    error.value = "";
    try {
        const res = await api<{ url: string }>(`/guilds/${guildId.value}/messages`, { method: "POST", body: draft.value });
        lastUrl.value = res.url;
        toast.show("Message sent");
    } catch (e) {
        error.value = apiError(e);
    } finally {
        busy.value = false;
    }
}
</script>
