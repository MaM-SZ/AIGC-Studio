import { ELEMENT_CUSTOM_TYPE } from '@/constants'
import useDrawStore from '@/store/draw'
import { initCustomObjectAttr } from '@/core/utils/object'
import { getRandomInt } from '@/utils/index'
import { paintBoard } from '@/core/paintBoard'
import { fabric } from 'fabric'

export class PixelsElement {
  lastTime = 0
  group: fabric.Group

  constructor() {
    const group = new fabric.Group([], {
      perPixelTargetFind: true
    })
    paintBoard.canvas?.add(group)
    this.group = group

    initCustomObjectAttr(group, ELEMENT_CUSTOM_TYPE.PIXELS)
  }

  addPosition(point: fabric.Point | undefined) {
    const now = Date.now()
    if (now - this.lastTime < 30 || !point) {
      return
    }
    this.lastTime = now
    const newPoint = new fabric.Point(point.x, point.y)

    this.group.addWithUpdate(drawPixels(newPoint.x, newPoint.y))
    paintBoard.canvas?.requestRenderAll()
  }

  destroy() {
    paintBoard.canvas?.remove(this.group)
  }
}

function drawPixels(x: number, y: number) {
  const rects = []
  const { currentMultiColor, drawColors, drawWidth } = useDrawStore.getState()
  const filterDrawColors = drawColors.filter((_, index) =>
    currentMultiColor.includes(index)
  )

  const size = Number(
    (drawWidth / (paintBoard?.canvas?.getZoom() ?? 1)).toFixed(2)
  )
  const step = Number(
    (drawWidth / 3 / (paintBoard?.canvas?.getZoom() ?? 1)).toFixed(2)
  )

  for (let i = -size; i < size; i += step) {
    for (let j = -size; j < size; j += step) {
      if (Math.random() > 0.5) {
        const color =
          filterDrawColors?.[getRandomInt(0, filterDrawColors.length - 1)] ??
          filterDrawColors[0]

        const rect = new fabric.Rect({
          left: x + i,
          top: y + j,
          width: step,
          height: step,
          fill: color
        })
        rects.push(rect)
      }
    }
  }
  return new fabric.Group(rects)
}
