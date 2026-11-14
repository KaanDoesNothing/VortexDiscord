<!-- Message template editor: textarea, clickable placeholders, character count and a live preview. -->
<template>
    <div>
        <textarea
            ref="textarea"
            :value="modelValue"
            :rows="rows"
            :maxlength="max"
            class="input font-mono text-sm"
            @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <button
                v-for="(description, token) in shownPlaceholders"
                :key="token"
                type="button"
                class="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300 hover:bg-zinc-700"
                :title="description"
                @click="insert(token)"
            >
                {{ token }}
            </button>
            <span class="ml-auto text-xs text-zinc-500">{{ modelValue.length }}/{{ max }}</span>
        </div>
        <div class="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div class="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">Preview</div>
            <p class="text-sm whitespace-pre-wrap text-zinc-200">{{ preview }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    modelValue: string;
    placeholders: Record<string, string>;
    // Which placeholders make sense here (default: all except context-specific ones).
    only?: string[];
    rows?: number;
    max?: number;
    sample?: Record<string, string>;
}>(), { rows: 3, max: 1500 });

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const textarea = ref<HTMLTextAreaElement>();

const shownPlaceholders = computed(() => Object.fromEntries(
    Object.entries(props.placeholders).filter(([token]) => !props.only || props.only.includes(token))
));

// Example values for the preview.
const sampleValues = computed<Record<string, string>>(() => ({
    "{user}": "vortexfan",
    "{user.name}": "Vortex Fan",
    "{user.mention}": "@Vortex Fan",
    "{user.id}": "123456789012345678",
    "{server}": "My Server",
    "{memberCount}": "1,234",
    "{channel}": "#general",
    "{level}": "5",
    "{args}": "some text",
    ...props.sample
}));

const preview = computed(() => props.modelValue.replace(/\{[\w.]+\}/g, (m) => sampleValues.value[m] ?? m));

// Inserts a placeholder at the cursor.
function insert(token: string) {
    const el = textarea.value;
    const start = el?.selectionStart ?? props.modelValue.length;
    const end = el?.selectionEnd ?? start;
    const next = props.modelValue.slice(0, start) + token + props.modelValue.slice(end);
    emit("update:modelValue", next.slice(0, props.max));
    nextTick(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
    });
}
</script>
