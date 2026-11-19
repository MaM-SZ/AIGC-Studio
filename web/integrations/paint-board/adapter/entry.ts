import { CHANNEL, isTrustedMessage, type BridgeMessage, type Environment } from "../bridge";
import { configureEnvironment } from "./environment";

// 先接收用户空间，再动态加载任何 store，避免在错误的空间触发自动恢复。
let runtime: Promise<typeof import("./runtime")> | undefined;
const send = (message: BridgeMessage) => window.parent.postMessage(message, window.location.origin);

window.addEventListener("message", async (event) => {
    if (!isTrustedMessage(event, window.parent, window.location.origin) || event.data.type !== "request") return;
    const message = event.data;
    try {
        let payload: unknown;
        if (message.action === "init") {
            configureEnvironment(message.payload as Environment);
            runtime ??= import("./runtime").then(async (module) => {
                await module.mount();
                return module;
            });
            await runtime;
        } else if (message.action === "sync") {
            configureEnvironment(message.payload as Environment);
            if (runtime) (await runtime).syncLanguage();
        } else {
            if (!runtime) throw new Error("Paint board not initialized");
            payload = await (await runtime).handleRequest(message);
        }
        send({ ...message, type: "response", payload });
    } catch (error) {
        send({ ...message, type: "response", payload: undefined, error: error instanceof Error ? error.message : "Paint board failed" });
    }
});

if (window.parent !== window) send({ channel: CHANNEL, type: "event", action: "ready" });
