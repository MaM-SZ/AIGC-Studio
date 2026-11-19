import { useEffect, useState } from "react";
import { fabric } from "fabric";
import { useTranslation } from "react-i18next";
import { paintBoard } from "@/core/paintBoard";
import { MIN_ZOOM, MAX_ZOOM } from "@/core/event/zoomEvent";
import { syncRoughShapePadding } from "@/core/element/shape/utils/roughGroup";
import useBoardStore from "@/store/board";

export default function ZoomControl() {
    const { i18n } = useTranslation();
    const chinese = i18n.language.startsWith("zh");
    const [percentage, setPercentage] = useState(() => Math.round((paintBoard.canvas?.getZoom() ?? 1) * 100));
    useEffect(() => {
        const canvas = paintBoard.canvas;
        const sync = () => setPercentage(Math.round((canvas?.getZoom() ?? 1) * 100));
        // 从实际视口同步，覆盖滚轮、快捷键、触摸缩放和工程切换。
        canvas?.on("after:render", sync);
        sync();
        return () => {
            canvas?.off("after:render", sync);
        };
    }, []);
    const updateZoom = (value: number) => {
        const canvas = paintBoard.canvas;
        const event = paintBoard.evnet?.zoomEvent;
        if (!canvas || !event || !paintBoard.canvasFileId) return;
        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value / 100));
        paintBoard.textElement.resetText();
        if (!useBoardStore.getState().isObjectCaching) fabric.Object.prototype.set({ objectCaching: true });
        syncRoughShapePadding(canvas.getObjects(), zoom);
        canvas.zoomToPoint(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), zoom);
        event.handleZoomPercentage(false);
        event.scheduleZoomWrite(zoom);
        setPercentage(Math.round(zoom * 100));
    };
    const commitZoom = () => {
        paintBoard.evnet?.zoomEvent.updateZoomPercentage.flush();
    };
    return (
        <div className="studio-zoom-control" role="group" aria-label={chinese ? "画板缩放" : "Canvas zoom"}>
            <input
                type="range"
                min={MIN_ZOOM * 100}
                max={MAX_ZOOM * 100}
                step={1}
                value={percentage}
                aria-label={chinese ? "画板缩放" : "Canvas zoom"}
                aria-valuetext={`${percentage}%`}
                onChange={(event) => updateZoom(Number(event.target.value))}
                onPointerUp={commitZoom}
                onKeyUp={commitZoom}
                onBlur={commitZoom}
            />
            <button type="button" title={chinese ? "重置为 100%" : "Reset to 100%"} aria-label={chinese ? "重置缩放至100%" : "Reset zoom to 100%"} onClick={() => updateZoom(100)}>
                {percentage}%
            </button>
        </div>
    );
}
