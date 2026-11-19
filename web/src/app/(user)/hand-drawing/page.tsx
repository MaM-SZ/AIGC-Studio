"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Empty, Input, Modal, Pagination, Spin } from "antd";
import { RotateCw, Search } from "lucide-react";
import { useTranslation } from "@/features/locale/use-translation";
import { useAssetStore, type ImageAsset } from "@/features/assets/stores/use-asset-store";
import { AssetCover } from "@/features/assets/components/asset-cover";
import { paginateAssets, queryAssets } from "@/features/assets/lib/asset-query";
import { getImageBlob, resolveImageUrl, uploadImage } from "@/features/storage/services/image-storage";
import { saveAsset } from "@/services/api/server";
import { usePaintBoard } from "./use-paint-board";
import { saveDrawingAsset } from "./drawing-asset";
import type { DrawingExport } from "../../../../integrations/paint-board/bridge";

export default function HandDrawingPage() {
    const translate = useTranslation();
    const { message } = App.useApp();
    const assets = useAssetStore((state) => state.assets);
    const hydrated = useAssetStore((state) => state.hydrated);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const board = usePaintBoard((event) => {
        if (event.action === "open-assets" && !busyRef.current) {
            setPickerOpen(true);
            setKeyword("");
            setPage(1);
        }
        if (event.action === "save-asset" && !busyRef.current) {
            const name = (event.payload as { title?: unknown })?.title;
            setTitle(typeof name === "string" ? name : translate("handDrawing.defaultTitle"));
            setSaveOpen(true);
        }
    });
    const filtered = useMemo(() => queryAssets(assets, { kind: "image", keyword }), [assets, keyword]);
    const result = paginateAssets(filtered, page, 12);
    const begin = () => {
        if (busyRef.current) return false;
        busyRef.current = true;
        setBusy(true);
        return true;
    };
    const end = () => {
        busyRef.current = false;
        setBusy(false);
    };

    useEffect(() => {
        busyRef.current = false;
        setBusy(false);
        setPickerOpen(false);
        setSaveOpen(false);
    }, [board.frameKey]);

    const insert = async (asset: ImageAsset) => {
        if (!begin()) return;
        const isCurrent = board.captureContext();
        try {
            let image = asset.data.storageKey ? await getImageBlob(asset.data.storageKey) : null;
            if (!image) {
                const url = await resolveImageUrl(asset.data.storageKey, asset.data.dataUrl, true);
                const response = await fetch(url);
                if (!response.ok) throw new Error("Image download failed");
                image = await response.blob();
            }
            if (!isCurrent()) return;
            await board.request("insert", { image });
            if (isCurrent()) {
                setPickerOpen(false);
                message.success(translate("handDrawing.inserted"));
            }
        } catch {
            if (isCurrent()) message.error(translate("handDrawing.insertFailed"));
        } finally {
            if (isCurrent()) end();
        }
    };

    const save = async () => {
        if (!title.trim() || !begin()) return;
        const isCurrent = board.captureContext();
        try {
            const drawing = await board.request<DrawingExport>("export");
            await saveDrawingAsset(drawing.image, title, {
                upload: uploadImage,
                persist: saveAsset,
                isCurrent,
                publish: (asset) => useAssetStore.setState((state) => ({ assets: [asset, ...state.assets] })),
            });
            if (isCurrent()) {
                setSaveOpen(false);
                message.success(translate("handDrawing.saved"));
            }
        } catch {
            if (isCurrent()) message.error(translate("handDrawing.saveFailed"));
        } finally {
            if (isCurrent()) end();
        }
    };

    return (
        <div className="relative h-full min-h-0 overflow-hidden bg-[var(--studio-page)]">
            <iframe key={board.frameKey} ref={board.frameRef} src="/paint-board/index.html" title={translate("handDrawing.title")} onLoad={board.onLoad} allow="fullscreen" className="block h-full w-full border-0" />
            {board.status !== "ready" ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--studio-page)] text-[var(--studio-muted)]" role="status" aria-live="polite">
                    {board.status === "loading" ? (
                        <>
                            <Spin />
                            <span className="text-sm">{translate("handDrawing.loading")}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-sm">{translate("handDrawing.loadFailed")}</span>
                            <Button
                                icon={<RotateCw className="size-4" />}
                                onClick={() => {
                                    end();
                                    setPickerOpen(false);
                                    setSaveOpen(false);
                                    board.retry();
                                }}
                            >
                                {translate("handDrawing.retry")}
                            </Button>
                        </>
                    )}
                </div>
            ) : null}

            <Modal
                title={translate("handDrawing.insertAsset")}
                open={pickerOpen}
                onCancel={() => {
                    if (!busy) setPickerOpen(false);
                }}
                footer={null}
                width={900}
                centered
                destroyOnHidden
                mask={{ closable: !busy }}
                closable={!busy}
            >
                <Spin spinning={busy || !hydrated}>
                    <Input
                        allowClear
                        prefix={<Search className="size-4 text-[var(--studio-muted)]" />}
                        placeholder={translate("handDrawing.searchAssets")}
                        value={keyword}
                        onChange={(event) => {
                            setKeyword(event.target.value);
                            setPage(1);
                        }}
                        className="mb-4"
                        disabled={busy}
                    />
                    {result.items.length ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {result.items.map((asset) => (
                                <button
                                    key={asset.id}
                                    type="button"
                                    disabled={busy || board.status !== "ready"}
                                    onClick={() => void insert(asset as ImageAsset)}
                                    className="overflow-hidden rounded-lg border border-[var(--studio-line)] bg-[var(--studio-surface)] text-left text-[var(--studio-ink)] transition hover:border-[var(--studio-action)] disabled:opacity-50"
                                >
                                    <AssetCover asset={asset} className="aspect-[4/3] w-full object-cover">
                                        <div className="aspect-[4/3] bg-[var(--studio-surface-raised)]" />
                                    </AssetCover>
                                    <span className="block truncate p-3 text-sm">{asset.title}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={translate("handDrawing.noImages")} className="py-12" />
                    )}
                    {result.totalPages > 1 ? <Pagination className="mt-4 justify-center" current={result.page} pageSize={result.pageSize} total={result.total} showSizeChanger={false} onChange={setPage} disabled={busy} /> : null}
                </Spin>
            </Modal>

            <Modal
                title={translate("handDrawing.saveAsset")}
                open={saveOpen}
                onCancel={() => {
                    if (!busy) setSaveOpen(false);
                }}
                onOk={() => void save()}
                okText={translate("handDrawing.save")}
                cancelText={translate("handDrawing.cancel")}
                confirmLoading={busy}
                okButtonProps={{ disabled: !title.trim() || board.status !== "ready" }}
                cancelButtonProps={{ disabled: busy }}
                mask={{ closable: !busy }}
                closable={!busy}
                centered
            >
                <label className="mb-2 block text-sm text-[var(--studio-text)]" htmlFor="drawing-asset-title">
                    {translate("handDrawing.assetName")}
                </label>
                <Input id="drawing-asset-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} onPressEnter={() => void save()} autoFocus />
            </Modal>
        </div>
    );
}
