<!-- Renders toasts from useToast(). Mounted once in app.vue. -->
<template>
    <div class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2" aria-live="polite">
        <TransitionGroup enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg"
                :class="toast.kind === 'error' ? 'border-red-900 bg-red-950 text-red-200' : 'border-zinc-700 bg-zinc-900 text-zinc-100'"
            >
                <svg v-if="toast.kind === 'error'" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>
                <svg v-else class="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.78a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.09l3.73-5.24Z" clip-rule="evenodd" /></svg>
                {{ toast.message }}
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
const { toasts } = useToast();
</script>
