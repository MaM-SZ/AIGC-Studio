import test from "node:test";
import assert from "node:assert/strict";
import { saveDrawingAsset } from "./drawing-asset.ts";

function setup() {
    const calls: string[] = [];
    const image = { url: "https://storage.test/image.png", storageKey: "image:1", width: 800, height: 600, bytes: 20, mimeType: "image/png" };
    return {
        calls,
        image,
        dependencies: {
            upload: async (_blob: Blob, options: { compress: boolean }) => {
                assert.equal(options.compress, false);
                calls.push("upload");
                return image;
            },
            persist: async (_asset: unknown) => {
                calls.push("persist");
            },
            publish: (_asset: unknown) => {
                calls.push("publish");
            },
            isCurrent: () => true,
        },
    };
}

test("PNG 上传和资产落库完成后才更新列表，保留图片尺寸及存储信息", async () => {
    const { calls, dependencies, image } = setup();
    const asset = await saveDrawingAsset(new Blob(["png"], { type: "image/png" }), "  我的画作  ", dependencies);
    assert.deepEqual(calls, ["upload", "persist", "publish"]);
    assert.equal(asset.title, "我的画作");
    assert.equal(asset.kind, "image");
    assert.equal(asset.data.width, image.width);
    assert.equal(asset.data.storageKey, image.storageKey);
    assert.equal(asset.coverUrl, image.url);
});

test("上传或资产落库失败时拒绝保存，不发布虚假资产", async () => {
    for (const step of ["upload", "persist"] as const) {
        const { calls, dependencies } = setup();
        dependencies[step] = async () => {
            throw new Error(step);
        };
        await assert.rejects(saveDrawingAsset(new Blob(["png"], { type: "image/png" }), "画作", dependencies), new RegExp(step));
        assert.equal(calls.includes("publish"), false);
    }
});

test("上传期间切换空间后停止后续保存，落库期间切换后不更新新空间", async () => {
    for (const step of ["upload", "persist"] as const) {
        const { calls, dependencies } = setup();
        const operation = dependencies[step];
        let current = true;
        dependencies.isCurrent = () => current;
        dependencies[step] = (async (...args: any[]) => {
            const result = await (operation as any)(...args);
            current = false;
            return result;
        }) as any;
        await assert.rejects(saveDrawingAsset(new Blob(["png"], { type: "image/png" }), "画作", dependencies), /context/i);
        assert.equal(calls.includes("publish"), false);
        if (step === "upload") assert.equal(calls.includes("persist"), false);
    }
});

test("拒绝空名称、非 PNG 和空图片，且不会发起上传", async () => {
    const { calls, dependencies } = setup();
    await assert.rejects(saveDrawingAsset(new Blob(["png"], { type: "image/png" }), " ", dependencies));
    await assert.rejects(saveDrawingAsset(new Blob(["jpeg"], { type: "image/jpeg" }), "画作", dependencies));
    await assert.rejects(saveDrawingAsset(new Blob([], { type: "image/png" }), "画作", dependencies));
    assert.equal(calls.length, 0);
});
