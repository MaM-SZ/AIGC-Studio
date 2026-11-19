import useCameraStore from '@/store/camera'

/**
 * adjust image data (brightness, contrast, saturation)
 * @param imageData image data
 * @returns adjusted image data
 */
export function applyBasicAdjustments(imageData: ImageData): ImageData {
  const { cameraBrightness, cameraContrast, cameraSaturation } =
    useCameraStore.getState()
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // apply brightness adjustment
    r *= cameraBrightness
    g *= cameraBrightness
    b *= cameraBrightness

    // apply contrast adjustment
    r = ((r / 255 - 0.5) * cameraContrast + 0.5) * 255
    g = ((g / 255 - 0.5) * cameraContrast + 0.5) * 255
    b = ((b / 255 - 0.5) * cameraContrast + 0.5) * 255

    // apply saturation adjustment
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * cameraSaturation
    g = gray + (g - gray) * cameraSaturation
    b = gray + (b - gray) * cameraSaturation

    // ensure the value is in the valid range
    data[i] = Math.min(255, Math.max(0, r))
    data[i + 1] = Math.min(255, Math.max(0, g))
    data[i + 2] = Math.min(255, Math.max(0, b))
  }

  return imageData
}
