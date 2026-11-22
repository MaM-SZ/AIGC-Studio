"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Input, Modal, Select, Spin } from "antd";
import { Download, ImagePlus, Save, Sparkles } from "lucide-react";
import { ModelPicker } from "@/features/settings/components/model-picker";
import { useEffectiveConfig } from "@/features/settings/stores/use-config-store";
import { GenerationStyleChips, GenerationStyleMenu, useGenerationStyles, type GenerationStyleSelection } from "@/features/generation/components/generation-style-picker";
import { CreditCostDisplay, requestCreditCost } from "@/features/generation/constants/credits";
import { useInsufficientCreditsPrompt } from "@/features/credits/use-insufficient-credits-prompt";
import { modelCreditBalance } from "@/features/team/credit-balance";
import { requestEdit } from "@/features/generation/api/image";
import { cancelAiTasksWithRefundPolicy } from "@/features/generation/lib/cancel-provider-generation";
import type { GeneratedImageResult } from "@/features/generation/api/image-task-result";
import { getImageBlob, resolveImageUrl, reuseOrUploadImage, uploadImage } from "@/features/storage/services/image-storage";
import { downloadMedia } from "@/features/storage/services/media-download";
import { saveAsset } from "@/services/api/server";
import { useAssetStore, type ImageAsset } from "@/features/assets/stores/use-asset-store";
import { beautifyDrawing, drawingBeautyModels } from "./drawing-beautify";
import type { DrawingExport } from "../../../../integrations/paint-board/bridge";

export type BeautySnapshot = { drawing: DrawingExport; isCurrent: () => boolean };

export function BeautifyModal({ snapshot, onClose, onInsert }: { snapshot: BeautySnapshot; onClose: () => void; onInsert: (image: Blob) => Promise<unknown> }) {
    const { message, modal } = App.useApp();
    const config = useEffectiveConfig();
    const models = useMemo(() => drawingBeautyModels(config), [config]);
    const [model, setModel] = useState(models.includes(config.imageModel) ? config.imageModel : models[0] || "");
    const [resolution, setResolution] = useState(config.imageResolution);
    const [description, setDescription] = useState("");
    const [styles, setStyles] = useState<GenerationStyleSelection[]>([]);
    const styleLibrary = useGenerationStyles("image");
    const [styleOpen, setStyleOpen] = useState(false);
    const [referenceUrl, setReferenceUrl] = useState("");
    const [resultUrl, setResultUrl] = useState("");
    const [result, setResult] = useState<GeneratedImageResult | null>(null);
    const [name, setName] = useState(`${snapshot.drawing.title || "手绘画作"} · AI 美化`);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [taskId, setTaskId] = useState("");
    const [stopping, setStopping] = useState(false);
    const stoppingRef = useRef(false);
    const [action, setAction] = useState("");
    const [saved, setSaved] = useState(false);
    const operation = useRef(false);
    const controller = useRef<AbortController | null>(null);
    const alive = useRef(true);
    const current = () => alive.current && snapshot.isCurrent();
    const cost = requestCreditCost({ modelCosts: config.modelCosts, model, taskType: "image", count: 1, resolution });
    const insufficient = useInsufficientCreditsPrompt({
        enabled: Boolean(model) && config.modelCosts.some((item) => item.model === model && item.taskType === "image"),
        requiredCredits: cost,
        availableCredits: modelCreditBalance(model),
        contextKey: `drawing-beautify:${model}`,
    });

    useEffect(() => {
        alive.current = true;
        const url = URL.createObjectURL(snapshot.drawing.image);
        setReferenceUrl(url);
        return () => {
            alive.current = false;
            controller.current?.abort();
            URL.revokeObjectURL(url);
        };
    }, [snapshot]);
    useEffect(() => {
        if (!models.includes(model)) setModel(models[0] || "");
    }, [models, model]);
    useEffect(() => {
        let active = true;
        setResultUrl("");
        if (result)
            void resolveImageUrl(result.storageKey, result.dataUrl).then((url) => {
                if (active) setResultUrl(url);
            });
        return () => {
            active = false;
        };
    }, [result]);

    const generate = async () => {
        if (operation.current || stoppingRef.current || !model || insufficient || !current()) return;
        operation.current = true;
        setBusy(true);
        setError("");
        setTaskId("");
        const abort = new AbortController();
        controller.current = abort;
        try {
            // 透明区域仅在 AI 参考图中补白，不改变原画背景。
            const bitmap = await createImageBitmap(snapshot.drawing.image);
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d")!;
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(bitmap, 0, 0);
            bitmap.close();
            const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("涂鸦读取失败，请重试"))), "image/png"));
            const images = await beautifyDrawing(
                { ...snapshot.drawing, image },
                {
                    config: { ...config, imageResolution: resolution },
                    model,
                    description,
                    styleIds: styles.map((style) => style.id),
                    signal: abort.signal,
                    isCurrent: current,
                    onTaskCreated: (id) => {
                        if (current()) setTaskId(id);
                    },
                },
                { upload: uploadImage, edit: requestEdit },
            );
            if (current()) {
                setResult(images[0]);
                setSaved(false);
            }
        } catch (reason) {
            if (current()) setError(reason instanceof Error && reason.name === "AbortError" ? "已停止生成" : reason instanceof Error ? reason.message : "美化失败，请重试");
        } finally {
            if (current()) {
                setBusy(false);
                operation.current = false;
            }
        }
    };

    const stop = async () => {
        if (!taskId || stoppingRef.current || !current()) return;
        stoppingRef.current = true;
        setStopping(true);
        const abort = controller.current;
        try {
            const outcome = await cancelAiTasksWithRefundPolicy([taskId], modal);
            if (current() && outcome !== "declined") abort?.abort();
        } catch (reason) {
            if (current()) message.error(reason instanceof Error ? reason.message : "停止失败，请重试");
        } finally {
            stoppingRef.current = false;
            if (current()) setStopping(false);
        }
    };

    const resultAction = async (kind: "download" | "insert" | "save") => {
        if (!result || operation.current || stoppingRef.current || !current() || (kind === "save" && !name.trim())) return;
        operation.current = true;
        setAction(kind);
        try {
            if (kind === "download") {
                const extension = result.mimeType === "image/jpeg" ? "jpg" : result.mimeType === "image/webp" ? "webp" : "png";
                await downloadMedia({ storageKey: result.storageKey, dataUrl: result.dataUrl.startsWith("data:") ? result.dataUrl : undefined, url: result.dataUrl }, `${name.trim() || "AI美化"}.${extension}`);
            } else if (kind === "insert") {
                const url = await resolveImageUrl(result.storageKey, result.dataUrl, true);
                const response = result.storageKey ? null : await fetch(url);
                if (response && !response.ok) throw new Error("图片读取失败");
                const image = result.storageKey ? await getImageBlob(result.storageKey) : await response!.blob();
                if (!image?.size) throw new Error("图片读取失败");
                if (!current()) return;
                await onInsert(image);
                if (current()) {
                    message.success("已插入画板，可撤销");
                    onClose();
                }
            } else {
                const stored = await reuseOrUploadImage(result);
                if (!current()) return;
                const now = new Date().toISOString();
                const { url, ...data } = stored;
                const asset: ImageAsset = { id: crypto.randomUUID(), kind: "image", title: name.trim(), coverUrl: url, tags: [], source: "手绘画板 AI 美化", createdAt: now, updatedAt: now, data: { ...data, dataUrl: url } };
                await saveAsset(asset);
                if (current()) {
                    useAssetStore.setState((state) => ({ assets: [asset, ...state.assets] }));
                    setSaved(true);
                    message.success("已保存到资产库");
                }
            }
        } catch (reason) {
            if (current()) message.error(reason instanceof Error ? reason.message : "操作失败，请重试");
        } finally {
            if (current()) {
                setAction("");
                operation.current = false;
            }
        }
    };

    return (
        <Modal
            open
            title={
                <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-5 text-[var(--studio-action)]" />
                    AI 美化
                </span>
            }
            width={1120}
            centered
            footer={null}
            onCancel={onClose}
            mask={{ closable: !busy && !action && !stopping }}
            closable={!busy && !action && !stopping}
            keyboard={!busy && !action && !stopping}
            styles={{ body: { maxHeight: "calc(100dvh - 144px)", overflowY: "auto" } }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <figure className="m-0 min-w-0">
                    <figcaption className="mb-2 text-sm text-[var(--studio-muted)]">手绘涂鸦</figcaption>
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-[var(--studio-line)] bg-white">
                        {referenceUrl && <img src={referenceUrl} alt="美化前的手绘涂鸦" width={800} height={600} className="size-full object-contain" />}
                    </div>
                </figure>
                <figure className="m-0 min-w-0">
                    <figcaption className="mb-2 text-sm text-[var(--studio-muted)]">生成图片</figcaption>
                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-[var(--studio-line)] bg-[var(--studio-surface-raised)]">
                        {resultUrl ? (
                            <img src={resultUrl} alt="AI 美化结果" width={800} height={600} className="size-full object-contain" onError={() => setError("结果预览加载失败，可尝试下载图片或重新生成")} />
                        ) : (
                            <span className="text-sm text-[var(--studio-muted)]">{busy ? "正在根据涂鸦生成…" : "选择风格和模型，开始美化"}</span>
                        )}
                        {busy && (
                            <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--studio-surface)]/90">
                                <Spin />
                                <span className="text-sm text-[var(--studio-text)]">正在美化，请稍候…</span>
                            </div>
                        )}
                    </div>
                </figure>
            </div>
            {error && <Alert type="error" showIcon title={error} className="mt-4" />}
            {!models.length && <Alert type="info" showIcon title="暂无可用的图生图模型，请联系管理员在模型渠道中启用图生图能力" className="mt-4" />}
            <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className={busy || action ? "pointer-events-none opacity-60" : ""} inert={busy || Boolean(action)}>
                    <ModelPicker config={config} value={model} onChange={setModel} capability="image" modelOptions={models} placeholder="选择图生图模型" showChannel className="max-w-72" />
                </div>
                <Select aria-label="图片清晰度" value={resolution} onChange={setResolution} options={["1K", "2K", "4K"].map((value) => ({ label: value, value }))} disabled={busy || Boolean(action)} className="w-24" />
                <GenerationStyleMenu
                    styles={styleLibrary.styles}
                    selected={styles}
                    loading={styleLibrary.loading}
                    error={styleLibrary.error}
                    open={styleOpen}
                    onOpenChange={setStyleOpen}
                    onSelect={(style) => {
                        setStyles([style]);
                        setStyleOpen(false);
                    }}
                    placement="topLeft"
                    disabled={busy || Boolean(action)}
                />
                <GenerationStyleChips styles={styles} onRemove={!busy && !action ? () => setStyles([]) : undefined} />
            </div>
            <label htmlFor="beautify-description" className="mb-2 mt-4 block text-sm text-[var(--studio-text)]">
                画面描述（选填）
            </label>
            <Input.TextArea
                id="beautify-description"
                placeholder="例如：一棵挂满彩灯的圣诞树，保留涂鸦中的轮廓与位置"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={4000}
                showCount
                disabled={busy || Boolean(action)}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--studio-line)] pt-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {result && (
                        <>
                            <Input
                                aria-label="美化图片名称"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setSaved(false);
                                }}
                                maxLength={200}
                                className="w-52!"
                                disabled={busy || Boolean(action)}
                            />
                            <Button icon={<Download className="size-4" />} onClick={() => void resultAction("download")} loading={action === "download"} disabled={busy || Boolean(action)}>
                                下载
                            </Button>
                            <Button icon={<Save className="size-4" />} onClick={() => void resultAction("save")} loading={action === "save"} disabled={busy || Boolean(action) || saved || !name.trim()}>
                                {saved ? "已保存" : "保存到资产库"}
                            </Button>
                            <Button icon={<ImagePlus className="size-4" />} onClick={() => void resultAction("insert")} loading={action === "insert"} disabled={busy || Boolean(action)}>
                                插回画板
                            </Button>
                        </>
                    )}
                </div>
                {busy ? (
                    <Button onClick={() => void stop()} disabled={!taskId} loading={stopping}>
                        {taskId ? "停止生成" : "正在准备…"}
                    </Button>
                ) : (
                    <Button type="primary" icon={<Sparkles className="size-4" />} onClick={() => void generate()} disabled={!model || Boolean(action) || stopping || insufficient}>
                        {result ? "重新生成" : "开始生成"}
                        <CreditCostDisplay creditCost={cost} />
                    </Button>
                )}
            </div>
        </Modal>
    );
}
