<template>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "manage-guild"
});

const config = useRuntimeConfig();

const route = useRoute();

const guildInfo = await $fetch<any>(`${config.public.api}/guild/information`, {body: {guild_id: route.params.id}, method: "POST"});
const guildData = await $fetch<any>(`${config.public.api}/guild/settings`, {body: {guild_id: route.params.id}, method: "POST"});
console.log(guildInfo);
</script>