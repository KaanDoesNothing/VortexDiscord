// Proxies /api/* to the bot's API (packages/client, port 7805 by default).
//
// Going through the frontend's own origin means:
//  - the login cookie is first-party, so it works on localhost and behind one domain in production
//  - no CORS setup is needed in the browser
//  - server-side rendering can forward the visitor's cookie
//
// The bot's API sets "Domain=<its host>" on cookies; that's stripped so the browser
// scopes the cookie to whatever domain the dashboard is served from.
export default defineEventHandler((event) => {
    const { apiUrl } = useRuntimeConfig(event);
    const path = getRouterParam(event, "path") ?? "";
    const target = new URL(path, apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
    target.search = getRequestURL(event).search;

    return proxyRequest(event, target.toString(), {
        cookieDomainRewrite: { "*": "" }
    });
});
