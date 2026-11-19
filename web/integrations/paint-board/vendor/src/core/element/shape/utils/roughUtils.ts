import rough from 'roughjs'
import { Options } from 'roughjs/bin/core'
import { RoughGenerator } from 'roughjs/bin/generator'
import { Point } from 'roughjs/bin/geometry'

/**
 * RoughJS Utils
 */
export class RoughShapeUtils {
  private static generator: RoughGenerator | null = null

  static getGenerator() {
    if (!this.generator) {
      this.generator = rough.generator()
    }
    return this.generator
  }

  /**
   * get rectangle paths
   * @param width
   * @param height
   * @param options
   * @returns Rough.PathInfo[]
   */
  static getRectanglePaths(width: number, height: number, options: Options) {
    const generator = this.getGenerator()
    const shape = generator.rectangle(0, 0, width, height, options)
    const paths = generator.toPaths(shape)
    return paths
  }

  /**
   * get circle paths
   * @param radius
   * @param options
   * @returns Rough.PathInfo[]
   */
  static getCirclePaths(radius: number, options: Options) {
    const generator = this.getGenerator()
    const shape = generator.circle(0, 0, radius, options)
    const paths = generator.toPaths(shape)
    return paths
  }

  /**
   * get regular polygon paths
   * @param width
   * @param height
   * @param sides
   * @param options
   * @returns Rough.PathInfo[]
   */
  static getRegularPolygonPaths(
    width: number,
    height: number,
    sides: number,
    options: Options
  ) {
    const generator = this.getGenerator()
    const shape = generator.polygon(
      regularPolygonFitBox(width, height, sides),
      options
    )
    const paths = generator.toPaths(shape)
    return paths
  }

  /**
   * get path paths
   * @param svgString
   * @param options
   * @returns Rough.PathInfo[]
   */
  static getPathPaths(svgString: string, options: Options) {
    const generator = this.getGenerator()
    const shape = generator.path(svgString, options)
    const paths = generator.toPaths(shape)
    return paths
  }
}

/**
 * get regular polygon fit box
 * @param width
 * @param height
 * @param sides
 * @returns Point[]
 */
function regularPolygonFitBox(width: number, height: number, sides: number) {
  if (sides < 3) throw new Error('Polygon must have at least 3 sides')

  const points = []
  // 1. generate unit circle regular polygon (radius=1, center at 0,0)
  for (let i = 0; i < sides; i++) {
    const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2 // vertex up
    const x = Math.cos(angle)
    const y = Math.sin(angle)
    points.push([x, y])
  }

  // 2. calculate original polygon bounding box
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const minX = Math.min(...xs),
    maxX = Math.max(...xs)
  const minY = Math.min(...ys),
    maxY = Math.max(...ys)
  const polyWidth = maxX - minX
  const polyHeight = maxY - minY

  // 3. calculate scale ratio
  const scaleX = width / polyWidth
  const scaleY = height / polyHeight

  // 4. map points to [0,width] x [0,height]
  return points.map(
    ([x, y]) => [(x - minX) * scaleX, (y - minY) * scaleY] as Point
  )
}
