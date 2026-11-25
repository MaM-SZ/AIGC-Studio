import assert from "node:assert/strict";
import test from "node:test";

const { imageReferenceAttachments, referenceMediaType, referenceMediaUrl, videoReferenceAttachments } = await import(new URL("./reference-attachments.ts", import.meta.url).href);

test("URL-only 历史参考图转换为图片附件", () => {
    const references = imageReferenceAttachments([
        { name: "最近上传的参考图", mimeType: "image/png", url: "https://storage.example.com/recent.png" },
    ]);

    assert.deepEqual(references, [{
        name: "最近上传的参考图",
        type: "image/png",
        url: "https://storage.example.com/recent.png",
    }]);
});

test("存储键参考素材优先使用对象存储地址并保留存储键", () => {
    const references = videoReferenceAttachments([
        {
            name: "clip.mp4",
            type: "video/mp4",
            url: "https://source.example.com/clip.mp4",
            storageKey: "video:clip",
            objectStorage: { url: "https://storage.example.com/clip.mp4" },
        },
    ]);

    assert.deepEqual(references, [{
        name: "clip.mp4",
        type: "video/mp4",
        url: "https://storage.example.com/clip.mp4",
        storageKey: "video:clip",
    }]);
});

test("历史字段可恢复为前端参考图字段", () => {
    const reference = { mimeType: "image/webp", url: "https://storage.example.com/reference.webp" };

    assert.equal(referenceMediaType(reference, "image/*"), "image/webp");
    assert.equal(referenceMediaUrl(reference), "https://storage.example.com/reference.webp");
});

test("首尾帧模式按有效图片顺序标记角色并保留媒体信息", () => {
    const images = [
        { name: "first.png", type: "image/png", storageKey: "image:first", objectStorage: { url: "https://storage.example.com/first.png" } },
        { name: "last.png", mimeType: "image/png", url: "https://storage.example.com/last.png" },
    ];
    assert.deepEqual(imageReferenceAttachments(images, "first-last-frame-to-video"), [
        { name: "first.png", type: "image/png", url: "https://storage.example.com/first.png", storageKey: "image:first", role: "first_frame" },
        { name: "last.png", type: "image/png", url: "https://storage.example.com/last.png", role: "last_frame" },
    ]);
    assert.deepEqual(imageReferenceAttachments([{ name: "empty" }, ...images], "first-last-frame-to-video"),
        imageReferenceAttachments(images, "first-last-frame-to-video"));
    assert.equal(images.some((image) => "role" in image), false);
});

test("其他视频模式不添加首尾帧角色", () => {
    const images = [{ name: "reference.png", type: "image/png", url: "https://storage.example.com/reference.png" }];
    const expected = [{ name: "reference.png", type: "image/png", url: "https://storage.example.com/reference.png" }];
    for (const mode of [undefined, "text-to-video", "image-to-video", "reference-to-video"] as const) {
        assert.deepEqual(imageReferenceAttachments(images, mode), expected);
    }
    assert.deepEqual(imageReferenceAttachments([], "first-last-frame-to-video"), []);
});
