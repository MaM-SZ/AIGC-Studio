import useDrawStore from '@/store/draw'
import { getDrawWidth } from '@/core/utils/draw'
import { paintBoard } from '@/core/paintBoard'
import { fabric } from 'fabric'
import { getStrokeDashArray } from './utils'

export const renderPencilBrush = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }

  const pencilBrush = new fabric.PencilBrush(canvas)
  canvas.isDrawingMode = true
  canvas.freeDrawingBrush = pencilBrush
  canvas.freeDrawingBrush.width = getDrawWidth()
  const {
    currentDrawColor,
    drawColors,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    shadowColor
  } = useDrawStore.getState()
  canvas.freeDrawingBrush.color = drawColors[currentDrawColor]

  const strokeDashArray = getStrokeDashArray()
  canvas.freeDrawingBrush.strokeDashArray = strokeDashArray

  if (shadowBlur > 0) {
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
      blur: shadowBlur,
      offsetX: shadowOffsetX,
      offsetY: shadowOffsetY,
      color: shadowColor
    })
  }
}
