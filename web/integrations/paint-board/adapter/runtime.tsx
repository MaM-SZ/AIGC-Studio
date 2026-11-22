import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Images, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import Board from "@/pages/board";
import { paintBoard } from "@/core/paintBoard";
import { ImageElement } from "@/core/element/image";
import { exportCanvasImage, applyExportBackground } from "@/core/export/exportCanvasImage";
import useFileStore, { DEFAULT_BACKGROUND_SORT } from "@/store/files";
import useBoardStore from "@/store/board";
import { hasFileHydrationFailed, hasFilePersistFailed } from "@/store/fileHydration";
import { FILE_LIST_STORAGE_KEY } from "@/store/fileRecord";
import i18n from "@/i18n";
import { CHANNEL, type BridgeMessage, type DrawingExport } from "../bridge";
import { currentEnvironment } from "./environment";
import "../vendor/src/index.css";
import "./theme.css";

const sendEvent = (action: "open-assets" | "save-asset", payload?: unknown) => window.parent.postMessage({ channel: CHANNEL, type: "event", action, payload }, window.location.origin);

function AssetTools() {
    useTranslation();
    const chinese = currentEnvironment().language === "zh";
    const [ready, setReady] = useState(Boolean(paintBoard.canvasFileId));
    // Board 在初次文件加载完成后才挂载工具；父页面也会等到 init 响应后才启用资产操作。
    useEffect(() => {
        const check = () => setReady(Boolean(paintBoard.canvasFileId));
        paintBoard.addHookFn(check);
        return () => paintBoard.removeHookFn(check);
    }, []);
    return (
        <div className="studio-asset-tools">
            <button type="button" disabled={!ready} onClick={() => sendEvent("open-assets")}>
                <Images size={16} />
                {chinese ? "从资产库插入" : "Insert asset"}
            </button>
            <button
                type="button"
                disabled={!ready}
                onClick={() => {
                    const { files, currentId } = useFileStore.getState();
                    sendEvent("save-asset", { title: files.find((file) => file.id === currentId)?.title || (chinese ? "手绘画作" : "Drawing") });
                }}
            >
                <Save size={16} />
                {chinese ? "保存到资产库" : "Save to assets"}
            </button>
        </div>
    );
}

export function syncLanguage() {
    const language = currentEnvironment().language;
    useBoardStore.getState().updateLanguage(language);
    void i18n.changeLanguage(language);
}

export async function mount() {
    syncLanguage();
    await new Promise<void>((resolve, reject) => {
        const check = () => {
            if (!paintBoard.canvasFileId) return;
            clearTimeout(timer);
            queueMicrotask(() => paintBoard.removeHookFn(check));
            if (hasFileHydrationFailed()) reject(new Error("Failed to restore local drawing"));
            else resolve();
        };
        const timer = setTimeout(() => {
            paintBoard.removeHookFn(check);
            reject(new Error("Paint board initialization timeout"));
        }, 25_000);
        paintBoard.addHookFn(check);
        createRoot(document.getElementById("root")!).render(
            <>
                <Board />
                <AssetTools />
            </>,
        );
    });
    const flush = () => {
        paintBoard.flushCurrentFile();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
    });
}

export async function handleRequest(message: BridgeMessage): Promise<unknown> {
    if (!paintBoard.canvas || !paintBoard.canvasFileId) throw new Error("Paint board is loading");
    if (message.action === "insert") {
        const image = (message.payload as { image?: Blob })?.image;
        if (!(image instanceof Blob) || !image.type.startsWith("image/") || !image.size) throw new Error("Invalid asset image");
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Failed to read asset image"));
            reader.readAsDataURL(image);
        });
        const inserted = await new ImageElement().addImage(dataUrl);
        if (!inserted) throw new Error("Failed to insert image");
        paintBoard.history?.saveState();
        return { inserted: true };
    }
    if (message.action === "flush") {
        paintBoard.flushCurrentFile();
        await useFileStore.persist.getOptions().storage?.setItem(FILE_LIST_STORAGE_KEY, { state: useFileStore.getState(), version: 0 });
        if (hasFilePersistFailed()) throw new Error("Failed to save local drawing");
        return;
    }
    if (message.action === "export") {
        if ((message.payload as { requireContent?: boolean } | undefined)?.requireContent && !paintBoard.canvas.getObjects().some((object) => object.visible !== false)) throw new Error("请先在画板中绘制内容");
        const { files, currentId } = useFileStore.getState();
        const file = files.find((item) => item.id === currentId);
        const colorIndex = file?.currentBackgroundColor ?? -1;
        const result = await exportCanvasImage(paintBoard.canvas, "viewport", {
            sort: file?.backgroundSort || DEFAULT_BACKGROUND_SORT,
            color: colorIndex >= 0 ? file?.backgroundColorList[colorIndex] || null : null,
            imageUrl: file?.backgroundImage || "",
            imageOpacity: file?.backgroundImageOpacity ?? 1,
            cameraFrame: null,
            cameraOpacity: 1,
        });
        const url = result.background && result.backgroundFrame ? await applyExportBackground(result.url, result.background, result.backgroundFrame) : result.url;
        return { image: await (await fetch(url)).blob(), title: file?.title || "" } satisfies DrawingExport;
    }
    throw new Error("Unsupported paint board operation");
}
