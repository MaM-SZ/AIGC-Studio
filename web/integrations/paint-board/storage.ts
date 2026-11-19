type StorageDriver = {
    getItem: <T>(key: string) => Promise<T | null>;
    setItem: <T>(key: string, value: T) => Promise<T>;
    removeItem: (key: string) => Promise<void>;
    keys: () => Promise<string[]>;
};

/** 将上游文件、图片和缩略图统一保存在当前用户空间的 IndexedDB 命名空间。 */
export function createScopedStorage(driver: StorageDriver, scope: string) {
    const prefix = `${scope}:`;
    return {
        get: async <T>(key: IDBValidKey): Promise<T | undefined> => (await driver.getItem<T>(prefix + String(key))) ?? undefined,
        set: async (key: IDBValidKey, value: unknown) => {
            await driver.setItem(prefix + String(key), value);
        },
        del: (key: IDBValidKey) => driver.removeItem(prefix + String(key)),
        keys: async () => (await driver.keys()).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)),
    };
}
