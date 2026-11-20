<!-- Edits a message template the bot sends (welcome, level-up, DMs...): text with placeholders, an optional
     embed (title, description, color, images, footer) and a live Discord-style preview with example values. -->
<template>
    <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4">
            <UiField label="Message text" :hint="model.embed.enabled ? 'Optional when the embed has content.' : undefined">
                <UiMessageEditor v-model="model.content" :placeholders="placeholders" :only="only" :max="2000" no-preview />
            </UiField>

            <UiToggle v-model="model.embed.enabled" label="Add an embed" description="A card with a colored edge, title, images and footer." />

            <template v-if="model.embed.enabled">
                <UiField label="Title"><input v-model="model.embed.title" maxlength="256" class="input" /></UiField>
                <UiField label="Description" hint="Placeholders work here too.">
                    <textarea v-model="model.embed.description" rows="4" maxlength="4000" class="input font-mono text-sm" />
                </UiField>
                <div class="grid grid-cols-[auto_1fr] items-end gap-4">
                    <UiField label="Color">
                        <div class="flex items-center gap-2">
                            <input :value="model.embed.color || brand" type="color" class="h-10 w-16 cursor-pointer rounded border border-zinc-800 bg-zinc-950" @input="model.embed.color = ($event.target as HTMLInputElement).value" />
                            <button v-if="model.embed.color" type="button" class="text-xs text-zinc-500 hover:text-zinc-300" @click="model.embed.color = ''">Use server color</button>
                        </div>
                    </UiField>
                    <UiField label="Footer"><input v-model="model.embed.footer" maxlength="2048" class="input" /></UiField>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="Image" hint="https:// link or {user.avatar} / {server.icon}"><input v-model="model.embed.image" placeholder="https://…" class="input" /></UiField>
                    <UiField label="Thumbnail" hint="Small image in the corner"><input v-model="model.embed.thumbnail" placeholder="{user.avatar}" class="input" /></UiField>
                </div>
            </template>
        </div>

        <div>
            <div class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Preview</div>
            <UiEmbedPreview :content="fillSample(model.content, sample)" :embed="previewEmbed" />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { MessageDraft, RichMessage } from "~/types/dashboard";

const props = defineProps<{
    placeholders: Record<string, string>;
    // Which placeholders make sense for this message (default: all).
    only?: string[];
    sample?: Record<string, string>;
}>();
const model = defineModel<RichMessage>({ required: true });

const { config } = useGuildDashboard();
// The server's brand color (General → Branding), or Vortex purple.
const brand = computed(() => config.value?.settings.branding.color || "#6d6af0");

const previewEmbed = computed<MessageDraft["embed"]>(() => {
    const e = model.value.embed;
    if (!e.enabled) return null;
    const fill = (s: string) => fillSample(s, props.sample);
    const image = fill(e.image);
    return {
        title: fill(e.title),
        description: fill(e.description),
        color: e.color || brand.value,
        image: image.startsWith("https://") ? image : "",
        footer: fill(e.footer)
    };
});
</script>
