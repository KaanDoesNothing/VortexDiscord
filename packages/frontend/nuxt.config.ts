import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    vite: {
        plugins: [tailwindcss()]
    },
    devServer: {
        port: 7807
    },
    runtimeConfig: {
        // Server-only: where the /api proxy forwards to. Override with NUXT_API_URL.
        apiUrl: "http://localhost:7805"
    },
    routeRules: {
        // The dashboard depends on the login cookie and is interactive, so it renders in the browser.
        "/dashboard/**": { ssr: false },
        "/oauth/**": { ssr: false },
        "/admin": { ssr: false },
        "/admin/**": { ssr: false }
    },
    app: {
        head: {
            htmlAttrs: { lang: "en" }
        }
    }
});
