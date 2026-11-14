<!-- Avatar + name for a user ID, falling back to the raw ID for users Discord no longer knows. -->
<template>
    <span class="inline-flex min-w-0 items-center gap-2">
        <img v-if="user" :src="user.avatar" alt="" class="h-6 w-6 shrink-0 rounded-full" loading="lazy" />
        <span v-else class="h-6 w-6 shrink-0 rounded-full bg-zinc-800" />
        <span class="truncate" :title="id ?? undefined">{{ user?.username ?? id ?? "Unknown" }}</span>
    </span>
</template>

<script setup lang="ts">
import type { ResolvedUser } from "~/types/dashboard";

defineProps<{ id: string | null; user?: ResolvedUser }>();
</script>
