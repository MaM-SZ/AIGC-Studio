import test from "node:test";
import assert from "node:assert/strict";
import { createScopedStorage } from "./storage.ts";

test("画板存储的读写、枚举和删除只作用于当前用户空间", async () => {
    const values = new Map<string, unknown>();
    const driver = {
        getItem: async <T>(key: string) => (values.get(key) ?? null) as T | null,
        setItem: async <T>(key: string, value: T) => {
            values.set(key, value);
            return value;
        },
        removeItem: async (key: string) => {
            values.delete(key);
        },
        keys: async () => [...values.keys()],
    };
    const a = createScopedStorage(driver, '["user1","team1"]');
    const b = createScopedStorage(driver, '["user1","team2"]');
    await a.set("files", { objects: ["line"] });
    await b.set("files", { objects: ["photo"] });
    assert.deepEqual(await a.get("files"), { objects: ["line"] });
    assert.deepEqual(await b.get("files"), { objects: ["photo"] });
    assert.deepEqual(await a.keys(), ["files"]);
    await a.del("files");
    assert.equal(await a.get("files"), undefined);
    assert.deepEqual(await b.get("files"), { objects: ["photo"] });
});
