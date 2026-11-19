import type { ImageAsset } from "@/features/assets/stores/use-asset-store";
import type { UploadedImage } from "@/features/storage/services/image-storage";

type SaveDependencies = {
    upload: (image: Blob, options: { compress: boolean }) => Promise<UploadedImage>;
    persist: (asset: ImageAsset) => Promise<unknown>;
    publish: (asset: ImageAsset) => void;
    isCurrent: () => boolean;
};

/** 等待真实落库后发布资产；空间变化时终止后续操作，不污染新空间列表。 */
export async function saveDrawingAsset(image: Blob, title: string, dependencies: SaveDependencies): Promise<ImageAsset> {
    if (!title.trim() || !(image instanceof Blob) || image.type !== "image/png" || !image.size) throw new Error("Invalid drawing image or title");
    const assertCurrent = () => {
        if (!dependencies.isCurrent()) throw new Error("Drawing context changed");
    };
    assertCurrent();
    const uploaded = await dependencies.upload(image, { compress: false });
    assertCurrent();
    const now = new Date().toISOString();
    const { url, ...data } = uploaded;
    const asset: ImageAsset = {
        id: crypto.randomUUID(),
        kind: "image",
        title: title.trim(),
        coverUrl: url,
        tags: [],
        source: "hand-drawing",
        createdAt: now,
        updatedAt: now,
        data: { ...data, dataUrl: url },
    };
    await dependencies.persist(asset);
    assertCurrent();
    dependencies.publish(asset);
    return asset;
}
