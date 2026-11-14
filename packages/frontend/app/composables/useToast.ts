// Minimal toast notifications, rendered by <UiToaster> in app.vue.
export interface Toast { id: number; message: string; kind: "success" | "error" }

let nextId = 0;

export function useToast() {
    const toasts = useState<Toast[]>("toasts", () => []);

    function show(message: string, kind: Toast["kind"] = "success") {
        const id = ++nextId;
        toasts.value.push({ id, message, kind });
        setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3000);
    }

    return { toasts, show };
}
