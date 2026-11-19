import { useEffect, useRef, useState, type PointerEvent } from "react";
import { fabric } from "fabric";
import { CircleHelp, Eraser, Hand, MousePointer2, Pencil, RotateCcw, Settings2, Type, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionMode } from "@/constants";
import { paintBoard } from "@/core/paintBoard";
import useBoardStore from "@/store/board";
import useFileStore from "@/store/files";
import DrawConfig from "@/components/toolPanel/drawConfig";
import EraserConfig from "@/components/toolPanel/eraserConfig";
import SelectConfig from "@/components/toolPanel/selectConfig";
import BoardConfig from "@/components/toolPanel/boardConfig";
import { modeSwitch } from "@/components/toolPanel/constant";
import CameraConfig from "@/components/cameraConfig";
import ZoomControl from "./zoom-control";

// 使用 Fabric 的视口平移，不向画作添加对象或写入撤销历史。
function PanSurface() {
    const gesture = useRef<{ x: number; y: number; fileId: string } | null>(null);
    const finish = () => {
        const fileId = gesture.current?.fileId;
        gesture.current = null;
        const canvas = paintBoard.canvas;
        if (canvas?.viewportTransform && fileId === paintBoard.canvasFileId) {
            useFileStore.getState().updateTransform([...canvas.viewportTransform], fileId);
        }
    };
    useEffect(() => finish, []);
    return (
        <div
            className="studio-pan-surface"
            onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary || !paintBoard.canvasFileId) return;
                gesture.current = { x: event.clientX, y: event.clientY, fileId: paintBoard.canvasFileId };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
                const previous = gesture.current;
                const canvas = paintBoard.canvas;
                if (!previous || !canvas || !event.isPrimary) return;
                if (previous.fileId !== paintBoard.canvasFileId) return finish();
                const rect = event.currentTarget.getBoundingClientRect();
                canvas.relativePan(new fabric.Point(((event.clientX - previous.x) * canvas.getWidth()) / rect.width, ((event.clientY - previous.y) * canvas.getHeight()) / rect.height));
                previous.x = event.clientX;
                previous.y = event.clientY;
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
        />
    );
}

export default function ToolPanel() {
    const { t, i18n } = useTranslation();
    const { mode, updateMode } = useBoardStore();
    const [open, setOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null);
    const chinese = i18n.language.startsWith("zh");
    const title = chinese ? "工具设置" : "Tool settings";
    const close = chinese ? "收起工具设置" : "Close tool settings";
    useEffect(() => {
        if (!open) return;
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                toggle.current?.focus();
            }
        };
        document.addEventListener("keydown", escape);
        return () => document.removeEventListener("keydown", escape);
    }, [open]);
    const tools = [
        { mode: ActionMode.SELECT, label: t("tool.select"), icon: MousePointer2 },
        { mode: ActionMode.DRAW, label: t("tool.draw"), icon: Pencil },
        { mode: ActionMode.ERASE, label: t("tool.eraser"), icon: Eraser },
        { mode: "text", label: t("operate.text"), icon: Type },
        { mode: "pan", label: chinese ? "平移画布" : "Pan canvas", icon: Hand },
    ];
    return (
        <>
            {mode === "pan" && <PanSurface />}
            <div className="studio-quick-tools" role="toolbar" aria-label={chinese ? "常用工具" : "Quick tools"} aria-orientation="vertical">
                {tools.map(({ mode: tool, label, icon: Icon }) => (
                    <button
                        key={tool}
                        type="button"
                        aria-label={label}
                        title={label}
                        aria-pressed={tool === "text" ? undefined : mode === tool}
                        onClick={() => {
                            paintBoard.textElement?.resetText();
                            if (tool === "text") paintBoard.textElement?.loadText({});
                            else updateMode(tool);
                        }}
                    >
                        <Icon size={20} />
                    </button>
                ))}
            </div>
            <section id="studio-tool-settings" className="studio-tool-settings" aria-label={title} style={open ? undefined : { display: "none" }}>
                <header>
                    <span>{title}</span>
                    <button type="button" onClick={() => setOpen(false)} aria-label={close} title={close}>
                        <X size={18} />
                    </button>
                </header>
                <div className="studio-settings-tabs" role="toolbar" aria-label={chinese ? "设置分类" : "Settings categories"}>
                    {modeSwitch.map(({ type, text }) => (
                        <button key={type} type="button" aria-pressed={mode === type} onClick={() => updateMode(type)}>
                            {t(text)}
                        </button>
                    ))}
                </div>
                <div className="studio-settings-content">
                    {mode === ActionMode.DRAW && <DrawConfig />}
                    {mode === ActionMode.ERASE && <EraserConfig />}
                    {mode === ActionMode.SELECT && <SelectConfig />}
                    {(mode === ActionMode.Board || mode === "pan") && <BoardConfig />}
                </div>
                <footer className="studio-settings-utilities">
                    <button type="button" onClick={() => paintBoard.evnet?.zoomEvent.resetZoom()}>
                        <RotateCcw size={16} />
                        {chinese ? "重置缩放" : "Reset zoom"}
                    </button>
                    <button type="button" onClick={() => (document.getElementById("help-modal") as HTMLDialogElement | null)?.showModal()}>
                        <CircleHelp size={16} />
                        {chinese ? "快捷键与帮助" : "Shortcuts & help"}
                    </button>
                    <div className="studio-settings-camera">
                        <span>{chinese ? "摄像头" : "Camera"}</span>
                        <CameraConfig />
                    </div>
                </footer>
            </section>
            <ZoomControl />
            <button ref={toggle} type="button" className="studio-settings-toggle" aria-label={title} title={open ? close : title} aria-expanded={open} aria-controls="studio-tool-settings" onClick={() => setOpen((value) => !value)}>
                <Settings2 size={20} />
            </button>
        </>
    );
}
