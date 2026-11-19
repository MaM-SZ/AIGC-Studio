import test from "node:test";
import assert from "node:assert/strict";
import { CHANNEL, createRequests, isTrustedMessage, storageScope } from "./bridge.ts";

test("消息只接受当前 iframe 的同源通信，并拒绝未知协议和类型", () => {
    const frame = {};
    const message = { channel: CHANNEL, type: "event", action: "ready" };
    const event = { source: frame, origin: "https://studio.test", data: message };
    assert.equal(isTrustedMessage(event, frame, event.origin), true);
    assert.equal(isTrustedMessage({ ...event, source: {} }, frame, event.origin), false);
    assert.equal(isTrustedMessage({ ...event, origin: "https://other.test" }, frame, event.origin), false);
    for (const data of [null, {}, { ...message, channel: "other" }, { ...message, action: "execute" }, { ...message, type: "request" }]) {
        assert.equal(isTrustedMessage({ ...event, data }, frame, event.origin), false);
    }
});

test("响应按请求 ID 关联，错误响应拒绝对应请求", async () => {
    const sent: any[] = [];
    const requests = createRequests((message) => sent.push(message));
    const first = requests.request("export");
    const second = requests.request("insert", { image: new Blob(["image"]) });
    requests.receive({ ...sent[1], type: "response", payload: { inserted: true } });
    assert.deepEqual(await second, { inserted: true });
    requests.receive({ ...sent[0], type: "response", error: "export failed" });
    await assert.rejects(first, /export failed/);
    requests.dispose();
});

test("同 ID 的错误操作响应不会完成请求，超时后允许重新请求", async () => {
    const sent: any[] = [];
    const requests = createRequests((message) => sent.push(message), 10);
    const pending = requests.request("export");
    requests.receive({ ...sent[0], type: "response", action: "insert", payload: {} });
    await assert.rejects(pending, /timeout/i);
    const retry = requests.request("export");
    requests.receive({ ...sent[1], type: "response", payload: { ok: true } });
    assert.deepEqual(await retry, { ok: true });
    requests.dispose();
});

test("卸载会拒绝未完成请求，忽略迟到响应并阻止后续发送", async () => {
    const sent: any[] = [];
    const requests = createRequests((message) => sent.push(message));
    const pending = requests.request("export");
    requests.dispose();
    await assert.rejects(pending, /closed/i);
    requests.receive({ ...sent[0], type: "response", payload: {} });
    await assert.rejects(requests.request("export"), /closed/i);
    assert.equal(sent.length, 1);
});

test("本地工程按用户和团队隔离，名称中包含分隔符也不会碰撞", () => {
    const scopes = [storageScope("u1", null), storageScope("u2", null), storageScope("u1", "t1"), storageScope("u1", "t2"), storageScope("a:b", "c"), storageScope("a", "b:c")];
    assert.equal(new Set(scopes).size, scopes.length);
    assert.equal(storageScope("u1", "t1"), scopes[2]);
});
