import { paintBoard } from '@/core/paintBoard'

export class ThreeFingerDoubleHandler {
  lastTapTime = 0
  doubleTapDelay = 300
  tapTimeout?: NodeJS.Timeout

  detectDoubleTap(currentTime: number) {
    const timeDiff = currentTime - this.lastTapTime
    if (timeDiff < this.doubleTapDelay) {
      this.handleDoubleTap()
      this.lastTapTime = 0
    } else {
      this.lastTapTime = currentTime

      this.tapTimeout = setTimeout(() => {
        this.lastTapTime = 0
      }, this.doubleTapDelay)
    }
  }

  private handleDoubleTap() {
    paintBoard.history?.redo()
  }

  reset() {
    this.lastTapTime = 0
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
      this.tapTimeout = undefined
    }
  }
}
