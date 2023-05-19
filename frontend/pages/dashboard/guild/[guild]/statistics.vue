<template>
    <div class="flex justify-center">
        <div class="stats shadow">
            <div class="stat">
                <div class="stat-title">Members</div>
                <div class="stat-value">{{ guildInfo.statistics.users }}</div>
            </div>
            
            <div class="stat">
                <div class="stat-title">Roles</div>
                <div class="stat-value">{{ guildInfo.statistics.roles }}</div>
            </div>

            <div class="stat">
                <div class="stat-title">Channels</div>
                <div class="stat-value">{{ guildInfo.statistics.channels }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "manage-guild"
});

const config = useRuntimeConfig();

const route = useRoute();

const key = useCookie("key").value;

const guildInfo = await $fetch<any>(`${config.public.api}/guild/information`, {body: {key, guild_id: route.params.guild}, method: "POST"});
// const guildData = await $fetch<any>(`${config.public.api}/guild/settings`, {body: {guild_id: route.params.id}, method: "POST"});
// console.log(guildInfo);
</script>