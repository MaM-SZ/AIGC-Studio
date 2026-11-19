import localforage from "localforage";
import { createScopedStorage } from "../storage";
import { currentEnvironment } from "./environment";

const driver = localforage.createInstance({ name: "novanova-hand-drawing", storeName: "boards", driver: localforage.INDEXEDDB });
const scoped = () => createScopedStorage(driver, currentEnvironment().scope);

// 保持 idb-keyval 的默认泛型签名，上游未显式传类型的读取仍按原接口推断。
export const get = <T = any>(key: IDBValidKey) => scoped().get<T>(key);
export const set = (key: IDBValidKey, value: unknown) => scoped().set(key, value);
export const del = (key: IDBValidKey) => scoped().del(key);
export const keys = () => scoped().keys();
