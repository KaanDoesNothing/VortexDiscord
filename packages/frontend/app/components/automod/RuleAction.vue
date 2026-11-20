<!-- What one auto-mod rule does when broken: the default punishment, or its own. -->
<template>
    <select v-model="model" class="input w-auto shrink-0 py-1.5 text-sm" title="What happens when this rule is broken">
        <option value="default">Default punishment</option>
        <option value="delete">Just delete</option>
        <option value="warn">Warn</option>
        <option value="timeout">Timeout</option>
        <option value="kick">Kick</option>
        <option value="ban">Ban</option>
    </select>
</template>

<script setup lang="ts">
import type { RuleAction } from "~/types/dashboard";

const model = defineModel<RuleAction>({ required: true });
</script>
