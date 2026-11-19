import { paintBoard } from '@/core/paintBoard'
import { brushMouseMixin } from '@/core/fabricMixin/brushMouse'
import {
  CanvasTransformHandler,
  TwoFingerDoubleHandler,
  ThreeFingerDoubleHandler
} from './touch'

export class CanvasTouchEvent {
  touches: number = 0
  canvasTransformHandler: CanvasTransformHandler

  // double tap detection
  twoFingerDoubleHandler: TwoFingerDoubleHandler
  threeFingerDoubleHandler: ThreeFingerDoubleHandler

  constructor() {
    this.initTouchEvents()
    this.canvasTransformHandler = new CanvasTransformHandler()
    this.twoFingerDoubleHandler = new TwoFingerDoubleHandler()
    this.threeFingerDoubleHandler = new ThreeFingerDoubleHandler()
  }

  initTouchEvents() {
    const canvas = paintBoard?.canvas?.upperCanvasEl
    if (canvas) {
      canvas.addEventListener('touchstart', this.touchStartFn, {
        passive: false
      })
      canvas.addEventListener('touchmove', this.touchMoveFn, { passive: false })
      canvas.addEventListener('touchend', this.touchEndFn, { passive: false })
    }
  }

  removeTouchEvents() {
    const canvas = paintBoard?.canvas?.upperCanvasEl
    if (canvas) {
      canvas.removeEventListener('touchstart', this.touchStartFn)
      canvas.removeEventListener('touchmove', this.touchMoveFn)
      canvas.removeEventListener('touchend', this.touchEndFn)
    }

    this.canvasTransformHandler.reset()
    this.twoFingerDoubleHandler.reset()
    this.threeFingerDoubleHandler.reset()
  }

  touchStartFn = (e: TouchEvent) => {
    e.preventDefault()
    const canvas = paintBoard.canvas
    if (!canvas) {
      return
    }
    const touches = e.touches
    this.touches = touches.length

    brushMouseMixin.updateIsDisableDraw(touches.length >= 2)

    this.canvasTransformHandler.transformStart(touches)
  }
  touchMoveFn = (e: TouchEvent) => {
    e.preventDefault()

    const canvas = paintBoard.canvas
    if (!canvas) {
      return
    }
    const touches = e.touches
    this.touches = touches.length

    this.canvasTransformHandler.transformMove(touches)
  }
  touchEndFn = (e: TouchEvent) => {
    const fingerCount = e.changedTouches.length

    this.detectDoubleTap(fingerCount)
    this.canvasTransformHandler.transformEnd()

    this.touches = 0

    if (e.touches.length === 0) {
      brushMouseMixin.updateIsDisableDraw(false)
    }
  }

  private detectDoubleTap(fingerCount: number) {
    const currentTime = Date.now()
    if (this.canvasTransformHandler.isDragging) {
      return
    }

    switch (fingerCount) {
      case 2:
        this.twoFingerDoubleHandler.detectDoubleTap(currentTime)
        break
      case 3:
        this.threeFingerDoubleHandler.detectDoubleTap(currentTime)
        break
      default:
        break
    }
  }
}
