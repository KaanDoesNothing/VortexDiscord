<template>
    <div class="drawer drawer-mobile" v-if="guildInfo">
        <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex flex-col">
            <Navbar></Navbar>

            <div class="self-center bg-neutral m-10" style="width: 90%">
                <div class="w-full rounded">
                    <div class="p-2 bg-neutral-focus text-center w-full rounded">
                        <label class="text-2xl capitalize font-sans font-bold">{{ route.name?.toString().split("-")[3] }}</label>
                    </div>
                    <div class="p-5">
                        <slot></slot>
                    </div>
                </div>
            </div>
        </div> 
        <div class="drawer-side">
            <label for="my-drawer-2" class="drawer-overlay"></label> 
            <ul class="menu w-80 bg-neutral text-base-content">
                <nav class="p-4 text-center flex flex-row justify-center">
                    <img class="h-10 w-10 rounded-full" :src="guildInfo.icon ? guildInfo.icon : 'https://i.redd.it/nx4jf8ry1fy51.gif'"/>
                    <label class="text-2xl btn btn-ghost">{{ guildInfo.name }}</label>
                </nav>
                <div class="p-5">
                    <div>
                        <label class="text-xl font-bold">General</label>
                        <div class="m-4 flex flex-col p-1">
                            <RouterLink :to="`/dashboard/guild/${guildInfo.id}/statistics`" class="text-xl">Statistics</RouterLink>
                            <a class="text-xl">Level System</a>
                        </div>
                    </div>
                    <div>
                        <label class="text-xl font-bold">Custom</label>
                        <div class="m-4 flex flex-col p-1">
                            <RouterLink :to="`/dashboard/guild/${guildInfo.id}/custom_commands`" class="text-xl">Commands</RouterLink>
                        </div>
                    </div>
                </div>
            </ul>
        
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useSessionStore } from "@/stores/session";

    const layout = "manageGuild";

    const config = useRuntimeConfig();
    const route = useRoute();

    const guildInfo = ref(<any>{});
    const sessionStore = useSessionStore();
    
    const sessionKey = useCookie("key").value;

    if(sessionKey && route.params.guild) {
        const res = await $fetch<any>(`${config.public.api}/guild/information`, {body: {guild_id: route.params.guild, key: sessionKey}, method: "POST"});
        guildInfo.value = res;
    }
</script>