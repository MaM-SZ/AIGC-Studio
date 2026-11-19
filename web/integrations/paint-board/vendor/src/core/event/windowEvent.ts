import { paintBoard } from '@/core/paintBoard'
import { KeyboardHandler } from './keyboard'

import useFileStore from '@/store/files'

export class WindowEvent {
  private keyboardHandler: KeyboardHandler

  constructor() {
    this.keyboardHandler = new KeyboardHandler()
    this.initWindowEvents()
  }

  initWindowEvents() {
    window.addEventListener('keydown', this.keydownFn)
    window.addEventListener('keyup', this.keyupFn)
    window.addEventListener('resize', this.resizeFn)
    window.addEventListener('orientationchange', this.resizeFn)
  }

  removeWindowEvents() {
    window.removeEventListener('keydown', this.keydownFn)
    window.removeEventListener('keyup', this.keyupFn)
    window.removeEventListener('resize', this.resizeFn)
    window.removeEventListener('orientationchange', this.resizeFn)
  }

  keydownFn = (e: KeyboardEvent) => {
    this.keyboardHandler.handleKeyDown(e)
  }

  keyupFn = (e: KeyboardEvent) => {
    this.keyboardHandler.handleKeyUp(e)
  }

  resizeFn = () => {
    const canvas = paintBoard.canvas
    if (canvas) {
      const { files, currentId } = useFileStore.getState()
      const file = files.find((item) => item.id === currentId)
      if (file) {
        canvas.setWidth(window.innerWidth * file.canvasWidth)
        canvas.setHeight(window.innerHeight * file.canvasHeight)
      }
    }
  }
}
