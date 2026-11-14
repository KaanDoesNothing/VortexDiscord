<!-- Ranked list with proportional bars (e.g. top commands). Labels and values are text, the bar only shows magnitude. -->
<template>
    <ol v-if="items.length" class="space-y-2.5">
        <li v-for="item in items" :key="item.label" class="group" :title="`${item.label}: ${item.value.toLocaleString()}`">
            <div class="mb-1 flex justify-between gap-3 text-sm">
                <span class="truncate font-mono text-zinc-200">{{ item.label }}</span>
                <span class="tabular-nums text-zinc-400">{{ item.value.toLocaleString() }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-zinc-800">
                <div class="h-1.5 rounded-full bg-[#7c7af5] transition-[width] group-hover:bg-[#9896f8]" :style="{ width: `${Math.max(2, (item.value / max) * 100)}%` }" />
            </div>
        </li>
    </ol>
    <p v-else class="py-6 text-center text-sm text-zinc-500">{{ empty ?? "No data yet" }}</p>
</template>

<script setup lang="ts">
const props = defineProps<{ items: { label: string; value: number }[]; empty?: string }>();
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)));
</script>
