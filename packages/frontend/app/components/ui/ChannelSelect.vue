<!-- Pick one text channel (or none). Channels the bot can't post in are marked. -->
<template>
    <select
        :value="modelValue ?? ''"
        class="input"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)"
    >
        <option value="">{{ placeholder ?? "No channel" }}</option>
        <option v-for="channel in channels" :key="channel.id" :value="channel.id">
            #{{ channel.name }}{{ channel.canSend ? "" : " (bot can't send here)" }}
        </option>
    </select>
</template>

<script setup lang="ts">
import type { ChannelOption } from "~/types/dashboard";

defineProps<{ modelValue: string | null; channels: ChannelOption[]; placeholder?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();
</script>
