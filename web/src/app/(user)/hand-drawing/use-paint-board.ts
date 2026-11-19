"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/features/auth/stores/use-user-store";
import { useTeamStore } from "@/features/team/stores/use-team-store";
import { useThemeStore } from "@/features/theme/stores/use-theme-store";
import { useTranslation } from "@/features/locale/use-translation";
import { registerHistoryLeaveGuard } from "@/shared/lib/navigation-history-guard";
import { createRequests, isTrustedMessage, storageScope, type Action, type BridgeMessage, type Environment } from "../../../../integrations/paint-board/bridge";

const colorNames = ["page", "surface", "surface-raised", "surface-hover", "ink", "text", "muted", "line", "line-strong", "action", "action-hover", "action-foreground"];
const currentScope = () => storageScope(useUserStore.getState().user?.id || "", String(useTeamStore.getState().team?.id || "") || null);
type Connection = { requests: ReturnType<typeof createRequests>; active: boolean; ready: boolean; scope: string };

export function usePaintBoard(onEvent: (message: BridgeMessage) => void) {
    const translate = useTranslation();
    const router = useRouter();
    const userId = useUserStore((state) => state.user?.id || "");
    const teamId = useTeamStore((state) => state.team?.id);
    const theme = useThemeStore((state) => state.resolvedTheme);
    const scope = storageScope(userId, teamId === undefined ? null : String(teamId));
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const frameRef = useRef<HTMLIFrameElement>(null);
    const connection = useRef<Connection | null>(null);
    const initialize = useRef<() => void>(() => {});
    const eventHandler = useRef(onEvent);
    const environment = useRef<() => Environment>(() => {
        throw new Error("Not initialized");
    });
    eventHandler.current = onEvent;
    environment.current = () => {
        const style = getComputedStyle(document.documentElement);
        return { scope, language: translate.locale === "en" ? "en" : "zh", dark: theme !== "light", colors: Object.fromEntries(colorNames.map((name) => [`--studio-${name}`, style.getPropertyValue(`--studio-${name}`).trim()])) };
    };

    useEffect(() => {
        const target = frameRef.current?.contentWindow;
        if (!target) return;
        setStatus("loading");
        const requests = createRequests((message) => target.postMessage(message, window.location.origin));
        const current: Connection = { requests, active: true, ready: false, scope };
        connection.current = current;
        let started = false;
        const fail = () => {
            if (current.active) {
                current.ready = false;
                setStatus("error");
            }
        };
        const timer = setTimeout(fail, 35_000);
        const init = () => {
            if (started || !current.active) return;
            started = true;
            void requests
                .request("init", environment.current())
                .then(async () => {
                    if (!current.active) return;
                    await requests.request("sync", environment.current());
                    if (!current.active) return;
                    clearTimeout(timer);
                    current.ready = true;
                    setStatus("ready");
                })
                .catch(fail);
        };
        initialize.current = init;
        const receive = (event: MessageEvent) => {
            if (!isTrustedMessage(event, target, window.location.origin)) return;
            requests.receive(event.data);
            if (event.data.type !== "event") return;
            if (event.data.action === "ready") init();
            else if (event.data.action === "fatal") fail();
            else if (current.ready) eventHandler.current(event.data);
        };
        window.addEventListener("message", receive);
        const flush = async () => {
            if (!current.ready) return true;
            try {
                await requests.request("flush");
                return current.active;
            } catch {
                fail();
                return false;
            }
        };
        const unregister = registerHistoryLeaveGuard(flush);
        let navigating = false;
        const interceptLink = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
            if (!link || link.download || (link.target && link.target !== "_self")) return;
            const url = new URL(link.href);
            if (!["http:", "https:"].includes(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname)) return;
            event.preventDefault();
            if (navigating) return;
            navigating = true;
            void flush()
                .then((allowed) => {
                    if (!allowed || !current.active) return;
                    if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);
                    else window.location.assign(url.href);
                })
                .finally(() => {
                    navigating = false;
                });
        };
        document.addEventListener("click", interceptLink, { capture: true });
        return () => {
            current.active = false;
            clearTimeout(timer);
            requests.dispose();
            unregister();
            window.removeEventListener("message", receive);
            document.removeEventListener("click", interceptLink, { capture: true });
            if (connection.current === current) connection.current = null;
        };
    }, [scope, attempt, router]);

    useEffect(() => {
        if (connection.current?.ready) void connection.current.requests.request("sync", environment.current()).catch(() => setStatus("error"));
    }, [theme, translate.locale]);

    const request = useCallback(<T>(action: Action, payload?: unknown) => {
        if (!connection.current?.ready) return Promise.reject<T>(new Error("Paint board not ready"));
        return connection.current.requests.request<T>(action, payload);
    }, []);
    const captureContext = useCallback(() => {
        const current = connection.current;
        return () => Boolean(current?.active && current.scope === currentScope());
    }, []);
    return { frameRef, frameKey: `${scope}:${attempt}`, status, request, captureContext, onLoad: () => initialize.current(), retry: () => setAttempt((value) => value + 1) };
}
