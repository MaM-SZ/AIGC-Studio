import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { fileURLToPath } from "node:url";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** 使用独立入口和配置，避免上游演示站统计、PWA 和依赖侵入主应用。 */
export default defineConfig({
    root: at("./"),
    base: "/paint-board/",
    publicDir: at("./vendor/public"),
    plugins: [react(), svgr()],
    resolve: {
        alias: [
            { find: /^@\/components\/toolPanel$/, replacement: at("./adapter/tool-panel.tsx") },
            { find: /^@\/components\/helpArea$/, replacement: at("./vendor/src/components/helpArea/helpModal/index.tsx") },
            { find: "@", replacement: at("./vendor/src") },
            { find: "idb-keyval", replacement: at("./adapter/idb-keyval.ts") },
        ],
    },
    build: { outDir: at("../../public/paint-board"), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
