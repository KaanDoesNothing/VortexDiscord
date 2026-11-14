<!-- Previous / next pager with a "showing x–y of z" summary. -->
<template>
    <div v-if="total > 0" class="flex items-center justify-between gap-4 text-sm text-zinc-400">
        <span>Showing {{ from.toLocaleString() }}–{{ to.toLocaleString() }} of {{ total.toLocaleString() }}</span>
        <div class="flex gap-2">
            <button type="button" class="btn-ghost" :disabled="page <= 1" @click="emit('update:page', page - 1)">Previous</button>
            <button type="button" class="btn-ghost" :disabled="page >= pages" @click="emit('update:page', page + 1)">Next</button>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ page: number; limit: number; total: number }>();
const emit = defineEmits<{ "update:page": [page: number] }>();

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));
const from = computed(() => (props.page - 1) * props.limit + 1);
const to = computed(() => Math.min(props.total, props.page * props.limit));
</script>
