declare module 'gradient-parser' {
  export interface ColorStop {
    type: string
    value: any
    length?: {
      value: number
      type: string
    }
  }

  export interface Orientation {
    type: string
    value: any
  }

  export interface ParsedGradient {
    type: string
    orientation?: Orientation
    colorStops: ColorStop[]
  }

  export function parse(gradient: string): ParsedGradient[]
}
