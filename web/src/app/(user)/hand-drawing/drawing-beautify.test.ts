import assert from "node:assert/strict";
import test from "node:test";
import { beautifyDrawing, drawingBeautyModels } from "./drawing-beautify.ts";
import type { AiConfig } from "@/features/settings/stores/use-config-store";

const config = {
    imageModels: ["a::edit", "a::text", "b::edit"],
    imageModel: "a::edit",
    modelCapabilities: [
        { model: "a::edit", capabilities: ["image-to-image"] },
        { model: "a::text", capabilities: ["text-to-image"] },
        { model: "b::edit", capabilities: ["image-to-image"] },
    ],
    count: "4",
    size: "1:1",
    quality: "high",
    imageResolution: "2K",
} as AiConfig;
const drawing = { image: new Blob(["png"], { type: "image/png" }), title: "圣诞树" };
const uploaded = { url: "https://example.test/sketch.png", storageKey: "image:sketch", width: 1600, height: 900, bytes: 3, mimeType: "image/png" };

function setup() {
    const calls: any[] = [];
    let current = true;
    const controller = new AbortController();
    const dependencies = {
        upload: async (...args: any[]) => {
            calls.push(["upload", ...args]);
            return uploaded;
        },
        edit: async (...args: any[]) => {
            calls.push(["edit", ...args]);
            return [{ id: "result", dataUrl: "https://example.test/result.png", generationStyleSnapshots: [] }];
        },
    };
    const options = { config, model: "a::edit", description: " 圣诞树 ", styleIds: [7], signal: controller.signal, isCurrent: () => current };
    return {
        calls,
        dependencies,
        options,
        controller,
        switchSpace: () => {
            current = false;
        },
    };
}

test("美化模型仅显示已配置图生图能力的渠道模型", () => {
    assert.deepEqual(drawingBeautyModels(config), ["a::edit", "b::edit"]);
});

test("美化先上传未压缩涂鸦，再使用渠道模型、风格和参考图发起单张图生图，保留比例", async () => {
    const { calls, dependencies, options } = setup();
    const result = await beautifyDrawing(drawing, options, dependencies);
    assert.equal(result[0].id, "result");
    assert.deepEqual(calls[0], ["upload", drawing.image, { compress: false }]);
    const [, requestConfig, prompt, references, mask, source, requestOptions] = calls[1];
    assert.equal(requestConfig.model, "a::edit");
    assert.equal(requestConfig.count, "1");
    assert.equal(requestConfig.size, "16:9");
    assert.match(prompt, /圣诞树/);
    assert.match(prompt, /构图/);
    assert.equal(references[0].storageKey, uploaded.storageKey);
    assert.equal(references[0].dataUrl, uploaded.url);
    assert.equal(mask, undefined);
    assert.equal(source, "canvas");
    assert.deepEqual(requestOptions.generationStyleIds, [7]);
    assert.equal(requestOptions.signal, options.signal);
});

test("不支持图生图的模型和无效图片不会发起上传或任务", async () => {
    const { calls, dependencies, options } = setup();
    await assert.rejects(beautifyDrawing(drawing, { ...options, model: "a::text" }, dependencies), /图生图/);
    await assert.rejects(beautifyDrawing({ ...drawing, image: new Blob([]) }, options, dependencies), /画板/);
    assert.equal(calls.length, 0);
});

test("透传生成任务标识，以便按现有积分策略取消", async () => {
    const state = setup();
    let taskId = "";
    const onTaskCreated = (id: string) => {
        taskId = id;
    };
    await beautifyDrawing(drawing, { ...state.options, onTaskCreated }, state.dependencies);
    state.calls[1][6].onTaskCreated("task-1");
    assert.equal(taskId, "task-1");
});

test("取消和上传期间切换空间后不发起生成", async () => {
    const state = setup();
    state.controller.abort();
    await assert.rejects(beautifyDrawing(drawing, state.options, state.dependencies), { name: "AbortError" });
    assert.equal(state.calls.length, 0);
    const switched = setup();
    switched.dependencies.upload = async () => {
        switched.switchSpace();
        return uploaded;
    };
    await assert.rejects(beautifyDrawing(drawing, switched.options, switched.dependencies), { name: "AbortError" });
    assert.equal(switched.calls.length, 0);
});

test("生成期间切换空间会丢弃结果，上传失败不会创建任务", async () => {
    const state = setup();
    state.dependencies.edit = async () => {
        state.switchSpace();
        return [{ id: "stale", dataUrl: "old", generationStyleSnapshots: [] }];
    };
    await assert.rejects(beautifyDrawing(drawing, state.options, state.dependencies), { name: "AbortError" });
    const failed = setup();
    failed.dependencies.upload = async () => {
        throw new Error("上传失败");
    };
    await assert.rejects(beautifyDrawing(drawing, failed.options, failed.dependencies), /上传失败/);
    assert.equal(failed.calls.length, 0);
});
