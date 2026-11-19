// Draw background image - Support object-fit: contain effect and opacity
export function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  opacity: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve()
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Calculate object-fit: contain dimensions and position
        const { x, y, width, height } = calculateContainDimensions(
          img.width,
          img.height,
          canvasWidth,
          canvasHeight
        )

        // Save current context state
        ctx.save()

        // Set opacity
        ctx.globalAlpha = opacity

        // Draw image
        ctx.drawImage(img, x, y, width, height)

        // Restore context state
        ctx.restore()
        resolve()
      } catch (error) {
        console.error('Error drawing background image:', error)
        ctx.restore() // Ensure context state is restored
        reject(error)
      }
    }

    img.onerror = () => {
      console.error('Failed to load background image:', imageUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = imageUrl
  })
}

// Calculate object-fit: contain dimensions and position
function calculateContainDimensions(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  // Calculate aspect ratios
  const imgAspectRatio = imgWidth / imgHeight
  const containerAspectRatio = containerWidth / containerHeight

  let width: number
  let height: number

  if (imgAspectRatio > containerAspectRatio) {
    // Image is wider, fit to container width
    width = containerWidth
    height = containerWidth / imgAspectRatio
  } else {
    // Image is taller, fit to container height
    height = containerHeight
    width = containerHeight * imgAspectRatio
  }

  // Calculate centered position
  const x = (containerWidth - width) / 2
  const y = (containerHeight - height) / 2

  return { x, y, width, height }
}
