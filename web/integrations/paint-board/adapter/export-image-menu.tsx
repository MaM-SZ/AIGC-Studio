import type { ComponentProps } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import ExportImageMenu from "../vendor/src/components/boardOperation/exportImageMenu";
import { CHANNEL } from "../bridge";

/** 在保存入口旁接入 AI 美化，保留上游导出菜单。 */
export default function DrawingExportMenu(props: ComponentProps<typeof ExportImageMenu>) {
    const { i18n } = useTranslation();
    const label = i18n.language.startsWith("zh") ? "AI 美化" : "AI enhance";
    return (
        <>
            <ExportImageMenu {...props} />
            <button
                type="button"
                aria-label={label}
                title={label}
                className="cursor-pointer px-2 py-1.5 text-[var(--studio-action)] hover:bg-[var(--studio-surface-hover)]"
                onClick={() => window.parent.postMessage({ channel: CHANNEL, type: "event", action: "beautify" }, window.location.origin)}
            >
                <Sparkles size={24} />
            </button>
        </>
    );
}
