import { StrokeStyleType } from '@/constants/shape'

import SolidIcon from '@/components/icons/drawLineType/solid.svg?react'
import DashedIcon from '@/components/icons/drawLineType/dashed.svg?react'
import DottedIcon from '@/components/icons/drawLineType/dotted.svg?react'
import SketchIcon from '@/components/icons/drawLineType/sketch.svg?react'

interface StrokeStyleSwitchType {
  type: string
  icon: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined
    }
  >
}

export const strokeStyleSwitch: Array<StrokeStyleSwitchType> = [
  {
    type: StrokeStyleType.Solid,
    icon: SolidIcon
  },
  {
    type: StrokeStyleType.Sketch,
    icon: SketchIcon
  },
  {
    type: StrokeStyleType.Dashed,
    icon: DashedIcon
  },
  {
    type: StrokeStyleType.Dotted,
    icon: DottedIcon
  }
]
