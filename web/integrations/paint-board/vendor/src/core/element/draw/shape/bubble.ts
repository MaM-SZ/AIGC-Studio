import { fabric } from 'fabric'
import { getRandomInt } from '@/utils/index'
import { generateRandomCoordinates } from '../utils'
import useDrawStore from '@/store/draw'

export function drawBubble(point: fabric.Point, size: number) {
  const { currentMultiColor, drawColors } = useDrawStore.getState()
  const filterDrawColors = drawColors.filter((_, index) =>
    currentMultiColor.includes(index)
  )

  if (useDrawStore.getState().drawShapeCount === 1) {
    const radius = getRandomInt(size * 0.3, size * 1)
    const left = point?.x - radius
    const top = point?.y - radius
    const circle = new fabric.Circle({
      left,
      top,
      radius,
      opacity: Math.random(),
      fill: filterDrawColors[getRandomInt(0, filterDrawColors.length - 1)]
    })
    return circle
  }

  const points = generateRandomCoordinates(
    point?.x,
    point?.y,
    size * 3,
    useDrawStore.getState().drawShapeCount
  )
  const circles = points.map((item) => {
    const radius = getRandomInt(size * 0.3, size)
    const color = filterDrawColors[getRandomInt(0, filterDrawColors.length - 1)]
    return new fabric.Circle({
      left: item.x,
      top: item.y,
      radius,
      opacity: Math.random(),
      fill: color
    })
  })
  const group = new fabric.Group(circles)
  return group
}
