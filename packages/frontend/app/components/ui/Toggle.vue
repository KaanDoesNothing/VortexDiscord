<!-- On/off switch with a label and optional description. -->
<template>
    <label class="flex cursor-pointer items-start justify-between gap-4" :class="{ 'cursor-not-allowed opacity-50': disabled }">
        <span>
            <span class="block text-sm font-medium text-zinc-100">{{ label }}</span>
            <span v-if="description" class="mt-0.5 block text-sm text-zinc-400">{{ description }}</span>
        </span>
        <button
            type="button"
            role="switch"
            :aria-checked="modelValue"
            :aria-label="label"
            :disabled="disabled"
            class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            :class="modelValue ? 'bg-brand-500' : 'bg-zinc-700'"
            @click="emit('update:modelValue', !modelValue)"
        >
            <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition" :class="{ 'translate-x-5': modelValue }" />
        </button>
    </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string; description?: string; disabled?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
