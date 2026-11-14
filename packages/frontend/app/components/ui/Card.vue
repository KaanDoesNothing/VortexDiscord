<!-- Section card with a title, optional description and an optional header action. -->
<template>
    <section class="rounded-xl border border-zinc-800 bg-zinc-900/60">
        <header v-if="title" class="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
            <div>
                <h2 class="font-semibold">{{ title }}</h2>
                <p v-if="description" class="mt-0.5 text-sm text-zinc-400">{{ description }}</p>
            </div>
            <slot name="action" />
        </header>
        <div class="space-y-5 p-5">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>
