<!-- Compose a message: channel, text, and an optional embed, with a live preview. Used by the embed builder and announcements. -->
<template>
    <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4">
            <UiField label="Channel">
                <UiChannelSelect v-model="model.channelId as string | null" :channels="channels" placeholder="Pick a channel…" />
            </UiField>
            <UiField label="Message text" hint="Optional. Mentions like @everyone or role pings will notify people.">
                <textarea v-model="model.content" rows="3" maxlength="2000" class="input" />
            </UiField>

            <UiToggle :model-value="!!model.embed" label="Include an embed" @update:model-value="toggleEmbed" />

            <template v-if="model.embed">
                <UiField label="Title"><input v-model="embed.title" maxlength="256" class="input" /></UiField>
                <UiField label="Description"><textarea v-model="embed.description" rows="5" maxlength="4000" class="input" /></UiField>
                <div class="grid grid-cols-[auto_1fr] items-end gap-4">
                    <UiField label="Color"><input v-model="embed.color" type="color" class="h-10 w-16 cursor-pointer rounded border border-zinc-800 bg-zinc-950" /></UiField>
                    <UiField label="Image URL" hint="Optional, must start with https://"><input v-model="embed.image" placeholder="https://…" class="input" /></UiField>
                </div>
                <UiField label="Footer"><input v-model="embed.footer" maxlength="2048" class="input" /></UiField>
            </template>
        </div>

        <div>
            <div class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Preview</div>
            <UiEmbedPreview :content="model.content" :embed="model.embed" />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ChannelOption, MessageDraft } from "~/types/dashboard";

defineProps<{ channels: ChannelOption[] }>();
const model = defineModel<MessageDraft>({ required: true });
// Non-null alias for the embed fields (only rendered while an embed exists).
const embed = computed(() => model.value.embed!);

function toggleEmbed(on: boolean) {
    model.value.embed = on ? { title: "", description: "", color: "#6d6af0", image: "", footer: "" } : null;
}
</script>
