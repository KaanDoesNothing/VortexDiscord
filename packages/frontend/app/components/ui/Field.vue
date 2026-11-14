<!-- Label + hint wrapper for a form control. -->
<template>
    <div>
        <label v-if="label" :for="for" class="block text-sm font-medium text-zinc-200">{{ label }}</label>
        <p v-if="hint" class="mt-0.5 text-sm text-zinc-400">{{ hint }}</p>
        <div :class="{ 'mt-2': label || hint }">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string; hint?: string; for?: string }>();
</script>
