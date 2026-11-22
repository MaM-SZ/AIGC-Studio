/** 主应用和独立画板唯一共享的通信协议，不依赖两边的 React 或 store。 */
export const CHANNEL = "novanova:paint-board:v1";
export type Action = "init" | "sync" | "insert" | "export" | "flush" | "ready" | "open-assets" | "save-asset" | "beautify" | "fatal";
export type BridgeMessage = {
    channel: typeof CHANNEL;
    type: "request" | "response" | "event";
    action: Action;
    id?: string;
    payload?: unknown;
    error?: string;
};
export type Environment = { scope: string; language: "zh" | "en"; dark: boolean; colors: Record<string, string> };
export type DrawingExport = { image: Blob; title: string };

const actions: readonly string[] = ["init", "sync", "insert", "export", "flush", "ready", "open-assets", "save-asset", "beautify", "fatal"];

export function isTrustedMessage(event: { source: unknown; origin: string; data: unknown }, source: unknown, origin: string): event is typeof event & { data: BridgeMessage } {
    if (!source || event.source !== source || event.origin !== origin || !event.data || typeof event.data !== "object") return false;
    const value = event.data as BridgeMessage;
    return (
        value.channel === CHANNEL &&
        actions.includes(value.action) &&
        (value.type === "event" || ((value.type === "request" || value.type === "response") && typeof value.id === "string" && value.id.length > 0)) &&
        (value.error === undefined || typeof value.error === "string")
    );
}

export function storageScope(userId: string, teamId: string | null) {
    return JSON.stringify([userId, teamId]);
}

export function createRequests(send: (message: BridgeMessage) => void, timeoutMs = 30_000) {
    const pending = new Map<string, { action: Action; resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    let closed = false;
    return {
        request<T = unknown>(action: Action, payload?: unknown): Promise<T> {
            if (closed) return Promise.reject(new Error("Paint board connection closed"));
            return new Promise((resolve, reject) => {
                const id = crypto.randomUUID();
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error("Paint board request timeout"));
                }, timeoutMs);
                pending.set(id, { action, resolve: resolve as (value: unknown) => void, reject, timer });
                try {
                    send({ channel: CHANNEL, type: "request", action, id, payload });
                } catch (error) {
                    clearTimeout(timer);
                    pending.delete(id);
                    reject(error);
                }
            });
        },
        receive(message: BridgeMessage) {
            const request = message.id && message.type === "response" ? pending.get(message.id) : undefined;
            if (!request || request.action !== message.action) return;
            clearTimeout(request.timer);
            pending.delete(message.id!);
            if (message.error) request.reject(new Error(message.error));
            else request.resolve(message.payload);
        },
        dispose() {
            closed = true;
            pending.forEach(({ reject, timer }) => {
                clearTimeout(timer);
                reject(new Error("Paint board connection closed"));
            });
            pending.clear();
        },
    };
}
