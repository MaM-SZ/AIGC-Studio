import { FillStyleType } from '@/constants/shape'

import TransparentIcon from '@/components/icons/fillStyle/transparent.svg?react'
import SolidIcon from '@/components/icons/fillStyle/solid.svg?react'
import HachureIcon from '@/components/icons/fillStyle/hachure.svg?react'
import CrossHatchIcon from '@/components/icons/fillStyle/crossHatch.svg?react'
import DotsIcon from '@/components/icons/fillStyle/dots.svg?react'

interface FillStyleSwitchType {
  type: string
  icon: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined
    }
  >
  isSketch: boolean
}

export const fillStyleSwitch: Array<FillStyleSwitchType> = [
  {
    type: FillStyleType.Transparent,
    icon: TransparentIcon,
    isSketch: false
  },
  {
    type: FillStyleType.Solid,
    icon: SolidIcon,
    isSketch: false
  },
  {
    type: FillStyleType.Hachure,
    icon: HachureIcon,
    isSketch: true
  },
  {
    type: FillStyleType.CrossHatch,
    icon: CrossHatchIcon,
    isSketch: true
  },
  {
    type: FillStyleType.Dots,
    icon: DotsIcon,
    isSketch: true
  }
]
