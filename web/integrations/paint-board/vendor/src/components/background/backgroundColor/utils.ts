import { parse, ColorStop } from 'gradient-parser'

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  colorString: string,
  width: number,
  height: number
) {
  try {
    // 1. Determine color type
    if (colorString.startsWith('linear-gradient')) {
      drawLinearGradient(ctx, colorString, width, height)
    } else if (colorString.startsWith('radial-gradient')) {
      drawRadialGradient(ctx, colorString, width, height)
    } else {
      // Solid color: #000000 or rgba() or rgb()
      drawSolidColor(ctx, colorString, width, height)
    }
  } catch (error) {
    console.error('Background drawing error:', error)
  }
}

// 1. Solid color drawing
function drawSolidColor(
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
  height: number
) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
}

// 2. Linear gradient drawing
function drawLinearGradient(
  ctx: CanvasRenderingContext2D,
  gradientString: string,
  width: number,
  height: number
) {
  console.log('Parsing linear gradient:', gradientString)

  // Parse using gradient-parser
  const parsed = parse(gradientString)[0] // Take the first gradient
  console.log('Parsed gradient:', parsed)

  if (parsed.type !== 'linear-gradient') {
    throw new Error('Expected linear gradient')
  }

  // Calculate gradient direction
  const { startX, startY, endX, endY } = calculateGradientDirection(
    parsed.orientation,
    width,
    height
  )

  const gradient = ctx.createLinearGradient(startX, startY, endX, endY)

  // Add color stops
  parsed.colorStops.forEach((stop: ColorStop, index: number) => {
    const color = formatColor(stop)
    let position = 0

    if (stop.length?.value !== undefined) {
      // Has explicit position
      if (stop.length.type === '%') {
        position = stop.length.value / 100
      } else {
        // Other units temporarily treated as percentage
        position = stop.length.value / 100
      }
    } else {
      // No position, distribute evenly
      position =
        parsed.colorStops.length > 1
          ? index / (parsed.colorStops.length - 1)
          : 0
    }

    console.log('Adding linear color stop:', { color, position })
    gradient.addColorStop(position, color)
  })

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

// 3. Radial gradient drawing
function drawRadialGradient(
  ctx: CanvasRenderingContext2D,
  gradientString: string,
  width: number,
  height: number
) {
  console.log('Parsing radial gradient:', gradientString)

  // Parse using gradient-parser
  const parsed = parse(gradientString)[0] // Take the first gradient
  console.log('Parsed radial gradient:', parsed)

  if (parsed.type !== 'radial-gradient') {
    throw new Error('Expected radial gradient')
  }

  // Radial gradient parameters
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.max(width, height) / 2

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius
  )

  // Add color stops
  parsed.colorStops.forEach((stop: ColorStop, index: number) => {
    const color = formatColor(stop)
    let position = 0

    if (stop.length?.value !== undefined) {
      // Has explicit position
      if (stop.length.type === '%') {
        position = stop.length.value / 100
      } else {
        // Other units temporarily treated as percentage
        position = stop.length.value / 100
      }
    } else {
      // No position, distribute evenly
      position =
        parsed.colorStops.length > 1
          ? index / (parsed.colorStops.length - 1)
          : 0
    }

    console.log('Adding radial color stop:', { color, position })
    gradient.addColorStop(position, color)
  })

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

// Color formatting function - Convert gradient-parser color objects to CSS color strings
function formatColor(colorStop: ColorStop): string {
  const { type, value } = colorStop

  if (type === 'hex') {
    return value
  } else if (type === 'rgb') {
    const [r, g, b] = value
    return `rgb(${r}, ${g}, ${b})`
  } else if (type === 'rgba') {
    const [r, g, b, a] = value
    return `rgba(${r}, ${g}, ${b}, ${a})`
  } else if (type === 'hsl') {
    const [h, s, l] = value
    return `hsl(${h}, ${s}%, ${l}%)`
  } else if (type === 'hsla') {
    const [h, s, l, a] = value
    return `hsla(${h}, ${s}%, ${l}%, ${a})`
  } else if (type === 'literal') {
    return value // For named colors like 'red', 'blue', etc.
  }

  // Default to black color
  console.warn('Unknown color type:', type, value)
  return '#000000'
}

// Calculate linear gradient direction - Adapt gradient-parser orientation format
function calculateGradientDirection(
  orientation: any,
  width: number,
  height: number
) {
  console.log('Calculating direction for orientation:', orientation)

  // gradient-parser returns direction which can be angle or keywords
  if (orientation?.type === 'angular') {
    const angle = orientation.value
    const radians = ((angle - 90) * Math.PI) / 180 // CSS angle conversion

    const centerX = width / 2
    const centerY = height / 2
    const diagonal = Math.sqrt(width * width + height * height) / 2

    return {
      startX: centerX - Math.cos(radians) * diagonal,
      startY: centerY - Math.sin(radians) * diagonal,
      endX: centerX + Math.cos(radians) * diagonal,
      endY: centerY + Math.sin(radians) * diagonal
    }
  }

  // Handle keyword directions
  if (orientation?.type === 'directional') {
    const value = orientation.value
    const directionMap: { [key: string]: any } = {
      right: { startX: 0, startY: 0, endX: width, endY: 0 },
      left: { startX: width, startY: 0, endX: 0, endY: 0 },
      bottom: { startX: 0, startY: 0, endX: 0, endY: height },
      top: { startX: 0, startY: height, endX: 0, endY: 0 },
      'bottom right': { startX: 0, startY: 0, endX: width, endY: height },
      'top left': { startX: width, startY: height, endX: 0, endY: 0 }
    }

    return directionMap[value] || directionMap.bottom
  }

  // Default from top to bottom
  return { startX: 0, startY: 0, endX: 0, endY: height }
}
