<template>
    <div class="navbar bg-neutral text-neutral-content p-3">
        <div class="navbar-start">
            <div class="dropdown">
                <label tabindex="0" class="btn btn-ghost lg:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                </label>
                <ul tabindex="0" class="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52">
                    <RouterLink to="/commands">Commands</RouterLink>
                    <RouterLink to="/privacy">Privacy</RouterLink>
                    <RouterLink to="/status">Status</RouterLink>
                </ul>
            </div>
            <img :src="generalStore.client_info?.avatar" class="h-10 w-10 mr-2 rounded-full"/>
            <RouterLink to="/" class="font-sans font-bold text-2xl">{{generalStore.client_info?.username}}</RouterLink>
        </div>
        <div class="navbar-center hidden lg:flex">
            <ul class="menu menu-horizontal px-1">
                <RouterLink to="/commands" class="btn">Commands</RouterLink>
                <RouterLink to="/privacy" class="btn">Privacy</RouterLink>
                <RouterLink to="/status" class="btn">Status</RouterLink>
            </ul>
        </div>
        <div class="navbar-end">
            <a class="btn bg-primary text-neutral normal-case rounded">Login with Discord</a>
        </div>
    </div>
    <!-- <div class="navbar bg-neutral text-neutral-content p-3">
        <div class="navbar-start">
            <img :src="generalStore.client_info?.avatar" class="h-10 w-10 mr-2 rounded-full"/>
            <RouterLink to="/" class="font-sans font-bold text-2xl">{{generalStore.client_info?.username}}</RouterLink>
        </div>
        <div class="navbar-center">
            <RouterLink to="/commands" class="btn">Commands</RouterLink>
            <RouterLink to="/privacy" class="btn">Privacy</RouterLink>
            <RouterLink to="/status" class="btn">Status</RouterLink>
        </div>
        <div class="navbar-end">
            <a class="btn bg-primary text-neutral normal-case rounded">Login with Discord</a>
        </div>
    </div> -->
</template>

<script lang="ts" setup>
import { useGeneralStore } from "@/stores/general";

const generalStore = useGeneralStore();    
</script>