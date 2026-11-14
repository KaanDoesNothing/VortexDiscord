<!-- Sticky "unsaved changes" bar shown while a page has edits. Also warns before leaving with unsaved edits. -->
<template>
    <Transition enter-from-class="translate-y-4 opacity-0" leave-to-class="translate-y-4 opacity-0" enter-active-class="transition" leave-active-class="transition">
        <div v-if="dirty" class="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl">
            <span class="text-sm text-zinc-300">You have unsaved changes</span>
            <div class="flex gap-2">
                <button type="button" class="btn-ghost" :disabled="saving" @click="emit('reset')">Reset</button>
                <button type="button" class="btn-primary" :disabled="saving" @click="emit('save')">
                    {{ saving ? "Saving…" : "Save changes" }}
                </button>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{ dirty: boolean; saving?: boolean }>();
const emit = defineEmits<{ save: []; reset: [] }>();

// Ask before navigating away inside the app...
onBeforeRouteLeave(() => {
    if (props.dirty && !confirm("You have unsaved changes. Leave anyway?")) return false;
});

// ...and before closing or reloading the tab.
const beforeUnload = (e: BeforeUnloadEvent) => {
    if (props.dirty) e.preventDefault();
};
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>
