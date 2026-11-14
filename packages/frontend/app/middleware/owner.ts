// Route middleware for the admin panel: logged out → /login, logged in but not a bot owner → home.
export default defineNuxtRouteMiddleware(async (to) => {
    const { fetchUser } = useAuth();
    const user = await fetchUser();

    if (!user) return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
    if (!user.isOwner) return navigateTo("/");
});
