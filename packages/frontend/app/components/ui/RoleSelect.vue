<!-- Pick one role. Roles the bot can't assign are marked (and optionally disabled). -->
<template>
    <select :value="modelValue ?? ''" class="input" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)">
        <option value="">{{ placeholder ?? "Pick a role…" }}</option>
        <option v-for="role in roles" :key="role.id" :value="role.id" :disabled="assignableOnly && !role.assignable">
            {{ role.name }}{{ role.assignable ? "" : " (bot can't assign)" }}
        </option>
    </select>
</template>

<script setup lang="ts">
import type { RoleOption } from "~/types/dashboard";

defineProps<{ modelValue: string | null; roles: RoleOption[]; placeholder?: string; assignableOnly?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();
</script>
