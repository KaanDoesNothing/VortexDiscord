// Editable copy of some saved value, with dirty tracking and reset.
// Pages edit `draft`; `dirty` turns true when it differs from `source`; `reset()` discards edits.
export function useDraft<T>(source: () => T | undefined) {
    const clone = (value: T | undefined) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as T);

    const draft = ref(clone(source())) as Ref<T | undefined>;
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(source()));

    // Whenever the saved value changes (load or save), start over from it.
    watch(source, (value) => (draft.value = clone(value)), { deep: true });

    const reset = () => (draft.value = clone(source()));

    return { draft, dirty, reset };
}
