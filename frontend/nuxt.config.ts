// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        "@nuxtjs/tailwindcss",
        "@pinia/nuxt"
    ],
    runtimeConfig: {
        public: {
            api: process.env.API
        }
    }
});
