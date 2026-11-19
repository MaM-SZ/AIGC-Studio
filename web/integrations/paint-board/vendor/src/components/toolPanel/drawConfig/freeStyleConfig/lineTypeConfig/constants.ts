import { DrawLineType } from '@/constants/draw'

import SolidIcon from '@/components/icons/drawLineType/solid.svg?react'
import DashedIcon from '@/components/icons/drawLineType/dashed.svg?react'
import DottedIcon from '@/components/icons/drawLineType/dotted.svg?react'

interface DrawLineTypeSwitchType {
  type: string
  icon: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined
    }
  >
}

export const drawLineTypeSwitch: Array<DrawLineTypeSwitchType> = [
  {
    type: DrawLineType.Solid,
    icon: SolidIcon
  },
  {
    type: DrawLineType.Dashed,
    icon: DashedIcon
  },
  {
    type: DrawLineType.Dotted,
    icon: DottedIcon
  }
]
