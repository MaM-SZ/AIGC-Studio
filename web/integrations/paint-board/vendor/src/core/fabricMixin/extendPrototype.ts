const _oldNeedsFullRender = fabric.BaseBrush.prototype.needsFullRender

fabric.BaseBrush.prototype.needsFullRender = function (...args: any) {
  if (this.strokeDashArray) {
    return true
  }

  return _oldNeedsFullRender.call(this, ...args)
}
