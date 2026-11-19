// camera filters
export interface FilterFunction {
  (imageData: ImageData): ImageData
}

export const cameraFilters: Record<string, FilterFunction> = {
  normal: (imageData) => imageData,

  warm: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.2) // R +20%
      data[i + 1] = Math.min(255, data[i + 1] * 1.05) // G +5%
      data[i + 2] = Math.max(0, data[i + 2] * 0.9) // B -10%
    }
    return imageData
  },

  cold: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, data[i] * 0.85) // R -15%
      data[i + 1] = Math.min(255, data[i + 1] * 1.05) // G +5%
      data[i + 2] = Math.min(255, data[i + 2] * 1.25) // B +25%
    }
    return imageData
  },

  grayscale: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = data[i + 1] = data[i + 2] = gray
    }
    return imageData
  },

  vintage: (imageData) => {
    const m = [
      0.62793, 0.32021, -0.03965, 0, 0.03784, 0.02578, 0.64411, 0.03259, 0,
      0.02926, 0.0466, -0.08512, 0.52416, 0, 0.02023, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  vivid: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, (data[i] - 128) * 1.3 + 128)
      data[i + 1] = Math.min(255, (data[i + 1] - 128) * 1.3 + 128)
      data[i + 2] = Math.min(255, (data[i + 2] - 128) * 1.3 + 128)
    }
    return imageData
  },

  soft: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 0.9 + 30)
      data[i + 1] = Math.min(255, data[i + 1] * 0.9 + 25)
      data[i + 2] = Math.min(255, data[i + 2] * 0.85 + 25)
    }
    return imageData
  },

  dramatic: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      data[i] = Math.min(255, Math.max(0, (data[i] - avg) * 1.8 + avg))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - avg) * 1.8 + avg))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - avg) * 1.8 + avg))
    }
    return imageData
  },

  moonlight: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = Math.max(0, gray * 0.6)
      data[i + 1] = Math.max(0, gray * 0.7)
      data[i + 2] = Math.min(255, gray * 0.9 + 40)
    }
    return imageData
  },

  sunrise: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.25 + 20)
      data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 10)
      data[i + 2] = Math.max(0, data[i + 2] * 0.85)
    }
    return imageData
  },

  pixel: (imageData) => {
    const data = imageData.data
    const w = imageData.width
    const h = imageData.height
    const pixelSize = 8 // pixel size

    for (let y = 0; y < h; y += pixelSize) {
      for (let x = 0; x < w; x += pixelSize) {
        // calculate the average color of the pixel block
        let r = 0,
          g = 0,
          b = 0,
          count = 0
        for (let py = 0; py < pixelSize && y + py < h; py++) {
          for (let px = 0; px < pixelSize && x + px < w; px++) {
            const i = ((y + py) * w + (x + px)) * 4
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        r = Math.floor(r / count)
        g = Math.floor(g / count)
        b = Math.floor(b / count)

        // fill the pixel block
        for (let py = 0; py < pixelSize && y + py < h; py++) {
          for (let px = 0; px < pixelSize && x + px < w; px++) {
            const i = ((y + py) * w + (x + px)) * 4
            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
          }
        }
      }
    }
    return imageData
  },

  emboss: (imageData) => {
    const data = imageData.data
    const w = imageData.width
    const h = imageData.height
    const newData = new Uint8ClampedArray(data)

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4
        const i1 = ((y - 1) * w + (x - 1)) * 4
        const i2 = ((y + 1) * w + (x + 1)) * 4

        for (let c = 0; c < 3; c++) {
          newData[i + c] = 128 + data[i1 + c] - data[i2 + c]
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = newData[i]
    }
    return imageData
  },

  blendColor: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
    return imageData
  },

  sketch: (imageData) => {
    const data = imageData.data
    const w = imageData.width
    const h = imageData.height

    // convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = data[i + 1] = data[i + 2] = gray
    }

    // invert
    const inverted = new Uint8ClampedArray(data.length)
    for (let i = 0; i < data.length; i += 4) {
      inverted[i] = inverted[i + 1] = inverted[i + 2] = 255 - data[i]
      inverted[i + 3] = data[i + 3]
    }

    // gaussian blur inverted image
    const blurred = new Uint8ClampedArray(inverted)
    const radius = 3
    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        let sum = 0,
          count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            sum += inverted[((y + dy) * w + (x + dx)) * 4]
            count++
          }
        }
        blurred[(y * w + x) * 4] = sum / count
      }
    }

    // color dodge mix
    for (let i = 0; i < data.length; i += 4) {
      const base = data[i]
      const blend = blurred[i]
      data[i] =
        data[i + 1] =
        data[i + 2] =
          Math.min(255, base + (base * blend) / (255 - blend + 1))
    }

    return imageData
  },

  invert: (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
    return imageData
  },

  blackWhite: (imageData) => {
    const m = [
      1.5, 1.5, 1.5, 0, -1, 1.5, 1.5, 1.5, 0, -1, 1.5, 1.5, 1.5, 0, -1, 0, 0, 0,
      1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  brownie: (imageData) => {
    const m = [
      0.5997, 0.34553, -0.27082, 0, 0.186, -0.0377, 0.86095, 0.15059, 0,
      -0.1449, 0.24113, -0.07441, 0.44972, 0, -0.02965, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  kodachrome: (imageData) => {
    const m = [
      1.12855, -0.39673, -0.03992, 0, 0.24991, -0.16404, 1.08352, -0.05498, 0,
      0.09698, -0.16786, -0.56034, 1.60148, 0, 0.13972, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  technicolor: (imageData) => {
    const m = [
      1.91252, -0.85453, -0.09155, 0, 0.04624, -0.30878, 1.76589, -0.10601, 0,
      -0.27589, -0.2311, -0.75018, 1.84759, 0, 0.12137, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  polaroid: (imageData) => {
    const m = [
      1.438, -0.062, -0.062, 0, 0, -0.122, 1.378, -0.122, 0, 0, -0.016, -0.016,
      1.483, 0, 0, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  sepia: (imageData) => {
    const m = [
      0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
      0, 0, 0, 0, 0, 1, 0
    ]
    const data = imageData.data
    const iLen = data.length
    let r
    let g
    let b
    let i = 0

    for (i = 0; i < iLen; i += 4) {
      r = data[i]
      g = data[i + 1]
      b = data[i + 2]
      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255
    }
    return imageData
  },

  noise: (imageData) => {
    const noise = 100
    const data = imageData.data
    let rand

    for (let i = 0, len = data.length; i < len; i += 4) {
      rand = (0.5 - Math.random()) * noise

      data[i] += rand
      data[i + 1] += rand
      data[i + 2] += rand
    }

    return imageData
  }
}
