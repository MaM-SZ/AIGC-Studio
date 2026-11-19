import type { Environment } from "../bridge";

let environment: Environment | undefined;

export function configureEnvironment(value: Environment) {
    if (!value || typeof value.scope !== "string" || !value.scope || !["zh", "en"].includes(value.language) || typeof value.dark !== "boolean" || !value.colors || typeof value.colors !== "object") throw new Error("Invalid paint board environment");
    if (environment && environment.scope !== value.scope) throw new Error("Drawing context changed");
    environment = value;
    document.documentElement.lang = value.language === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.theme = "studio";
    document.documentElement.style.colorScheme = value.dark ? "dark" : "light";
    for (const [name, color] of Object.entries(value.colors)) {
        if (/^--studio-[\w-]+$/.test(name) && typeof color === "string") document.documentElement.style.setProperty(name, color);
    }
}

export function currentEnvironment() {
    if (!environment) throw new Error("Paint board not initialized");
    return environment;
}
