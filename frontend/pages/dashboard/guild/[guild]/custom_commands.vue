<template>
    <div class="flex justify-center flex-col">
        <div>
            <div class="text-center text-xl">
                <label>Create command</label>
            </div>

            <div class="flex justify-center p-5">
                <div class="flex flex-col">
                    <label>Name</label>
                    <input class="input"/>
                    <br>
                    <button class="btn btn-success rounded">Create</button>
                </div>
            </div>

            <div class="text-center text-xl p-5">
                <label>Edit command</label>
            </div>

            <div class="p-5 bg-gray-700 rounded flex justify-between" v-for="command in guildSettings.custom.commands">
                <label class="font-sans capitalize">{{ command.name }}</label>
                <button @click="showCode(command.name)">Edit</button>
            </div>
        </div>

        <div v-if="visible" class="pt-10">
            <MonacoEditor lang="handlebars" class="w-full h-80 rounded" v-model="code" :options="{theme: 'vs-dark'}"/>
            <div class="flex justify-center">
                <button @click="handleReset" class="btn">Cancel</button>
                <button @click="handleSave" class="btn">Save</button>
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

const code = ref("");
const current_command = ref("");
const visible = ref(false);
const isNew = ref(false);

const guildInfo = await $fetch<any>(`${config.public.api}/guild/information`, {body: {guild_id: route.params.guild}, method: "POST"});
const guildSettings = await $fetch<any>(`${config.public.api}/guild/settings/get`, {body: {guild_id: route.params.guild}, method: "POST"});

async function handleSave() {
    const command = guildSettings.custom.commands.filter((cmd: any) => cmd.name === current_command.value)[0];
    command.source = code.value;
    await $fetch<any>(`${config.public.api}/guild/settings/update`, {body: {guild_id: route.params.guild, data: guildSettings}, method: "POST"});
}

function handleReset() {
    code.value = "";
    current_command.value = "";
    visible.value = false;
    isNew.value = false;
}

function showCode(command_name: string) {
    const command = guildSettings.custom.commands.filter((cmd: any) => cmd.name === command_name)[0];
    code.value = command.source;
    visible.value = true;
    current_command.value = command_name;
    isNew.value = false;
}
</script>