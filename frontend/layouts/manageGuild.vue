<template>
    <div class="drawer drawer-mobile">
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
                    <img class="h-10 w-10 rounded-full" :src="guildInfo.icon"/>
                    <label class="text-2xl btn btn-ghost">{{ guildInfo.name }}</label>
                </nav>
                <li><RouterLink :to="`/dashboard/guild/${guildInfo.id}/statistics`" class="text-xl">Statistics</RouterLink></li>
                <li><a class="text-xl">Level System</a></li>
            </ul>
        
        </div>
    </div>
</template>

<script lang="ts" setup>
    const layout = "manageGuild";

    const config = useRuntimeConfig();
    const route = useRoute();

    const guildInfo = ref(<any>{});

    if(route.params.guild) {
        guildInfo.value = await $fetch<any>(`${config.public.api}/guild/information`, {body: {guild_id: route.params.guild}, method: "POST"});
    }
</script>