import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("./", import.meta.url));
const output = fileURLToPath(new URL("../../public/paint-board/", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Paint board command failed (${code}): ${command}`))));
    });

async function fingerprint(paths) {
    const hash = createHash("sha256");
    const visit = async (path) => {
        const entries = await readdir(path, { withFileTypes: true });
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            const file = join(path, entry.name);
            hash.update(file.slice(root.length));
            if (entry.isDirectory()) await visit(file);
            else hash.update(await readFile(file));
        }
    };
    for (const path of paths) {
        if (path.endsWith("/")) await visit(join(root, path));
        else hash.update(await readFile(join(root, path)));
    }
    return hash.digest("hex");
}

const dependencyHash = await fingerprint(["package.json", "pnpm-lock.yaml"]);
const dependencyStamp = join(root, "node_modules/.paint-board-dependencies");
if (!existsSync(dependencyStamp) || (await readFile(dependencyStamp, "utf8")) !== dependencyHash) {
    await run(npm, ["exec", "--yes", "--package=pnpm@8.15.9", "--", "pnpm", "install", "--frozen-lockfile", "--ignore-scripts", "--ignore-workspace", "--store-dir=.pnpm-store"]);
    await writeFile(dependencyStamp, dependencyHash);
}

const sourceHash = await fingerprint(["vendor/", "adapter/", "bridge.ts", "storage.ts", "index.html", "vite.config.ts", "tailwind.config.cjs", "postcss.config.cjs", "package.json", "pnpm-lock.yaml", "prepare.mjs"]);
const buildStamp = join(output, ".source-hash");
if (!existsSync(join(output, "index.html")) || !existsSync(buildStamp) || (await readFile(buildStamp, "utf8")) !== sourceHash) {
    await run(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "build"]);
    await writeFile(buildStamp, sourceHash);
}
