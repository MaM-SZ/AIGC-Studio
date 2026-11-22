import type { AiConfig } from "@/features/settings/stores/use-config-store";
import type { requestEdit } from "@/features/generation/api/image";
import type { uploadImage } from "@/features/storage/services/image-storage";
import { IMAGE_ASPECT_RATIOS } from "@/features/generation/lib/image-size-mappings";
import type { DrawingExport } from "../../../../integrations/paint-board/bridge";

export function drawingBeautyModels(config: AiConfig) {
    return config.imageModels.filter((model) => config.modelCapabilities.some((item) => item.model === model && item.capabilities.includes("image-to-image")));
}

/** 复用服务器图生图任务；上传前后和结果发布前均检查用户空间。 */
export async function beautifyDrawing(
    drawing: DrawingExport,
    options: { config: AiConfig; model: string; description: string; styleIds: number[]; signal: AbortSignal; isCurrent: () => boolean; onTaskCreated?: (taskId: string) => void },
    dependencies: { upload: typeof uploadImage; edit: typeof requestEdit },
) {
    const check = () => {
        if (options.signal.aborted || !options.isCurrent()) throw new DOMException("Aborted", "AbortError");
    };
    check();
    if (!drawingBeautyModels(options.config).includes(options.model)) throw new Error("请选择支持图生图的模型");
    if (!drawing.image.size || drawing.image.type !== "image/png") throw new Error("请先在画板中绘制内容");
    const reference = await dependencies.upload(drawing.image, { compress: false });
    check();
    const ratio = reference.width / reference.height;
    const distance = (size: string) => {
        const [w, h] = size.split(":").map(Number);
        return Math.abs(Math.log(w / h / ratio));
    };
    const size = IMAGE_ASPECT_RATIOS.reduce((best, item) => (distance(item) < distance(best) ? item : best));
    const prompt = `请将参考图中的手绘涂鸦美化为完整、精致的画作。保留原图主体、构图、物体位置和比例，补充细节、色彩、材质与光影，避免添加无关主体、文字或水印。${options.description.trim() ? `\n画面描述：${options.description.trim()}` : ""}`;
    const result = await dependencies.edit(
        { ...options.config, model: options.model, imageModel: options.model, count: "1", size },
        prompt,
        [{ id: crypto.randomUUID(), name: drawing.title || "手绘涂鸦", type: reference.mimeType, dataUrl: reference.url, storageKey: reference.storageKey, objectStorage: reference.objectStorage }],
        undefined,
        "canvas",
        { signal: options.signal, generationStyleIds: options.styleIds, onTaskCreated: options.onTaskCreated },
    );
    check();
    return result;
}
