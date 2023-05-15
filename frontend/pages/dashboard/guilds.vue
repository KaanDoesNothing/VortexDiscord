<template>
    <div class="flex justify-center">
        <div class="my-40 bg-neutral-focus rounded">
            <div class="p-2 text-center bg-neutral w-auto rounded text-xl">
                Servers
            </div>
            <div class="p-5">
                <div class="grid flex justify-center md:grid-cols-4 md:gap-4 md:p-4">
                    <div class="p-5 bg-base-100 flex flex-col" v-for="guild in guilds.filter((guild: any) => guild.permissions.includes('ADMINISTRATOR') || guild.permissions.includes('MANAGE_GUILD'))" :key="guild.name">
                        <div>
                            <img :src="guild.iconUrl" class="h-48 w-48 rounded-md">
                        </div>
                        <div class="text-center py-4">
                            <label class="font-sans font-bold">{{ guild.name }}</label>
                        </div>
                        <div class="text-center flex flex-col">
                            <a :href="`/dashboard/guild/${guild.id}/statistics`" class="btn" v-if="guild.inGuild">Manage</a>
                            <a class="btn" :href="`https://discord.com/oauth2/authorize?client_id=${generalStore.client_info?.id}&scope=bot&permissions=1099511627767&&guild_id=${guild.id}`" v-if="!guild.inGuild">Invite</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSessionStore } from "@/stores/session";
import { useGeneralStore } from "@/stores/general";

const config = useRuntimeConfig();
const sessionStore = useSessionStore();
const generalStore = useGeneralStore();  

const key = useCookie("key").value;

const guilds = await $fetch<any>(`${config.public.api}/authentication/guilds`, {body: {key}, method: "POST"});
</script>