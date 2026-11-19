import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: { alias: { "@": fileURLToPath(new URL("./vendor/src", import.meta.url)) } },
    test: { include: ["vendor/src/**/*.test.ts"] },
});
