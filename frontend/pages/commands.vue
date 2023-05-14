<template>
    <div class="flex justify-center">
        <div class="my-40 bg-neutral-focus rounded">
            <div class="p-2 text-center bg-neutral w-auto rounded text-xl">
                Commands
            </div>
            <div class="p-5">
                <div class="flex justify-center">
                    <div class="tabs tabs-boxed">
                        <a class="tab" v-for="category in categories" :class="{'tab-active': category === active}" @click="active = category">{{ category }}</a>
                    </div>
                </div>

                <table class="table w-full mt-5">
                    <thead>
                        <tr>
                            <th>Command</th>
                            <th>Description</th>
                            <th>Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="command in commands.filter((cmd: any) => cmd.category === active)" :key="command.name">
                            <td class="font-bold">{{ command.name }}</td>
                            <td>{{ command.description }}</td>
                            <td>/{{ command.name }} {{ command.arguments.map((arg: any) => `[${arg.name}]`).join(" ") }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    const config = useRuntimeConfig();
    const commands = await $fetch<any>(`${config.public.api}/information/commands`);
    const categories = (() => {
        const list: string[] = [];

        for (const i in commands) {
            const command = commands[i];

            if(!list.includes(command.category)) list.push(command.category);
        }

        return list;
    })();

    const active = ref(categories[0]);
</script>

<style>
    body {
        /* overflow: */
    }
</style>