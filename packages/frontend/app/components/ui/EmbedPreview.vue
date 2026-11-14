<!-- Approximate Discord rendering of a message with an optional embed, for live previews. -->
<template>
    <div class="flex gap-3 rounded-lg bg-[#313338] p-4 text-[15px] text-[#dbdee1]">
        <img v-if="bot" :src="bot.avatar" alt="" class="h-10 w-10 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1">
            <div class="mb-0.5 flex items-center gap-1.5">
                <span class="font-medium text-white">{{ bot?.username ?? "Bot" }}</span>
                <span class="rounded bg-[#5865f2] px-1 text-[10px] font-semibold text-white">APP</span>
            </div>
            <p v-if="content" class="whitespace-pre-wrap break-words">{{ content }}</p>
            <div v-if="embed && (embed.title || embed.description || embed.image)" class="mt-1 max-w-[520px] overflow-hidden rounded border-l-4 bg-[#2b2d31] p-3" :style="{ borderColor: embed.color || '#6d6af0' }">
                <div v-if="embed.title" class="mb-1 font-semibold text-white">{{ embed.title }}</div>
                <div v-if="embed.description" class="text-sm whitespace-pre-wrap break-words">{{ embed.description }}</div>
                <img v-if="embed.image" :src="embed.image" alt="" class="mt-3 max-h-64 rounded" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                <div v-if="embed.footer" class="mt-2 text-xs text-[#b5bac1]">{{ embed.footer }}</div>
            </div>
            <p v-if="!content && !(embed && (embed.title || embed.description || embed.image))" class="text-sm text-[#949ba4] italic">Nothing to preview yet.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { MessageDraft } from "~/types/dashboard";

defineProps<{ content: string; embed: MessageDraft["embed"] }>();
const { data: bot } = await useClientInfo();
</script>
