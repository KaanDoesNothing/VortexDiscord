<!-- One auto-mod rule: on/off, its punishment, and its settings (the slot) while it's on. -->
<template>
    <div class="space-y-2 border-b border-zinc-800/70 pb-4 last:border-0 last:pb-0">
        <div class="flex items-start justify-between gap-4">
            <UiToggle v-model="enabled" :label="label" :description="description" />
            <AutomodRuleAction v-if="enabled" v-model="action" />
        </div>
        <div v-if="enabled && $slots.default" class="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { RuleAction } from "~/types/dashboard";

defineProps<{ label: string; description?: string }>();
const enabled = defineModel<boolean>("enabled", { required: true });
const action = defineModel<RuleAction>("action", { required: true });
</script>
