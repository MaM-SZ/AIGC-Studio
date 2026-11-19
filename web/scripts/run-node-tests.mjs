import { spawnSync } from "node:child_process";

const files = process.argv.slice(2);
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--loader", "./scripts/node-test-loader.mjs", "--test", ...(files.length ? files : ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}", "integrations/paint-board/*.test.ts"])], {
    stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
