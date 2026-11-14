<!-- Pick several channels or roles: selected ones show as removable chips, plus a searchable list. -->
<template>
    <div>
        <div v-if="selected.length" class="mb-2 flex flex-wrap gap-2">
            <span
                v-for="item in selected"
                :key="item.id"
                class="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 py-1 pr-1.5 pl-3 text-sm"
            >
                <span v-if="item.color" class="h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" />
                {{ item.label }}
                <button type="button" class="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100" :aria-label="`Remove ${item.label}`" @click="toggle(item.id)">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                </button>
            </span>
        </div>

        <details class="group rounded-lg border border-zinc-800 bg-zinc-900">
            <summary class="cursor-pointer list-none px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100">
                + Add {{ noun }}
            </summary>
            <div class="border-t border-zinc-800 p-2">
                <input v-model="search" type="search" :placeholder="`Search ${noun}s…`" class="input mb-2" />
                <ul class="max-h-56 overflow-y-auto">
                    <li v-for="option in filtered" :key="option.id">
                        <button
                            type="button"
                            :disabled="option.disabled"
                            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                            @click="toggle(option.id)"
                        >
                            <span class="flex h-4 w-4 items-center justify-center rounded border" :class="modelValue.includes(option.id) ? 'border-brand-500 bg-brand-500' : 'border-zinc-600'">
                                <svg v-if="modelValue.includes(option.id)" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" /></svg>
                            </span>
                            <span v-if="option.color" class="h-2.5 w-2.5 rounded-full" :style="{ background: option.color }" />
                            <span class="truncate">{{ option.label }}</span>
                            <span v-if="option.note" class="ml-auto shrink-0 text-xs text-zinc-500">{{ option.note }}</span>
                        </button>
                    </li>
                    <li v-if="!filtered.length" class="px-2 py-3 text-center text-sm text-zinc-500">Nothing found</li>
                </ul>
            </div>
        </details>
    </div>
</template>

<script setup lang="ts">
export interface PickerOption { id: string; label: string; color?: string; note?: string; disabled?: boolean }

const props = withDefaults(defineProps<{ modelValue: string[]; options: PickerOption[]; noun?: string; max?: number }>(), { noun: "item" });
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const search = ref("");

const selected = computed(() => props.modelValue
    .map((id) => props.options.find((o) => o.id === id) ?? { id, label: `Unknown (${id})` }));

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return props.options.filter((o) => !q || o.label.toLowerCase().includes(q));
});

function toggle(id: string) {
    if (props.modelValue.includes(id)) return emit("update:modelValue", props.modelValue.filter((v) => v !== id));
    if (props.max && props.modelValue.length >= props.max) return useToast().show(`You can pick at most ${props.max}`, "error");
    emit("update:modelValue", [...props.modelValue, id]);
}
</script>
