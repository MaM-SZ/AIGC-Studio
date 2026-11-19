/**
 * convert basic shapes in SVG string to path strings
 * @param {string} svgString - SVG string
 * @returns {string[]} - path strings array
 */
export function svgShapesToPaths(svgString: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const paths: string[] = []

  // handle circle
  doc.querySelectorAll('circle').forEach((circle) => {
    const cx = parseFloat(circle.getAttribute('cx') || '0')
    const cy = parseFloat(circle.getAttribute('cy') || '0')
    const r = parseFloat(circle.getAttribute('r') || '0')

    // use two half circles to draw a complete circle
    const path = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${
      cx + r
    } ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
    paths.push(path)
  })

  // handle ellipse
  doc.querySelectorAll('ellipse').forEach((ellipse) => {
    const cx = parseFloat(ellipse.getAttribute('cx') || '0')
    const cy = parseFloat(ellipse.getAttribute('cy') || '0')
    const rx = parseFloat(ellipse.getAttribute('rx') || '0')
    const ry = parseFloat(ellipse.getAttribute('ry') || '0')

    const path = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${
      cx + rx
    } ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
    paths.push(path)
  })

  // handle rect
  doc.querySelectorAll('rect').forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x') || '0')
    const y = parseFloat(rect.getAttribute('y') || '0')
    const w = parseFloat(rect.getAttribute('width') || '0')
    const h = parseFloat(rect.getAttribute('height') || '0')
    const rx = parseFloat(rect.getAttribute('rx') || '0')
    const ry = parseFloat(rect.getAttribute('ry') || String(rx) || '0')

    if (rx > 0 || ry > 0) {
      // rounded rectangle
      const path = `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${ry} 0 0 1 ${
        x + w
      } ${y + ry} L ${x + w} ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${
        y + h
      } L ${x + rx} ${y + h} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} L ${x} ${
        y + ry
      } A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
      paths.push(path)
    } else {
      // normal rectangle
      const path = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${
        y + h
      } Z`
      paths.push(path)
    }
  })

  // handle line
  doc.querySelectorAll('line').forEach((line) => {
    const x1 = parseFloat(line.getAttribute('x1') || '0')
    const y1 = parseFloat(line.getAttribute('y1') || '0')
    const x2 = parseFloat(line.getAttribute('x2') || '0')
    const y2 = parseFloat(line.getAttribute('y2') || '0')

    const path = `M ${x1} ${y1} L ${x2} ${y2}`
    paths.push(path)
  })

  // handle polyline
  doc.querySelectorAll('polyline').forEach((polyline) => {
    const points = polyline.getAttribute('points')?.trim()
    if (points) {
      const coords = points.split(/[\s,]+/).filter((p) => p)
      if (coords.length >= 2) {
        let path = `M ${coords[0]} ${coords[1]}`
        for (let i = 2; i < coords.length; i += 2) {
          path += ` L ${coords[i]} ${coords[i + 1]}`
        }
        paths.push(path)
      }
    }
  })

  // handle polygon
  doc.querySelectorAll('polygon').forEach((polygon) => {
    const points = polygon.getAttribute('points')?.trim()
    if (points) {
      const coords = points.split(/[\s,]+/).filter((p) => p)
      if (coords.length >= 2) {
        let path = `M ${coords[0]} ${coords[1]}`
        for (let i = 2; i < coords.length; i += 2) {
          path += ` L ${coords[i]} ${coords[i + 1]}`
        }
        path += ' Z' // polygon needs to be closed
        paths.push(path)
      }
    }
  })

  // handle existing path
  doc.querySelectorAll('path').forEach((path) => {
    const d = path.getAttribute('d')
    if (d) {
      paths.push(d)
    }
  })

  return paths
}
