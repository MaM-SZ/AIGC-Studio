import BringForWardIcon from '@/components/icons/layer/bringforward.svg?react'
import SendBackWardIcon from '@/components/icons/layer/sendbackward.svg?react'
import BringToFrontIcon from '@/components/icons/layer/bringtofront.svg?react'
import SendToBackIcon from '@/components/icons/layer/sendtoback.svg?react'

import { paintBoard } from '@/core/paintBoard'
import { useTranslation } from 'react-i18next'

const layerList = [
  {
    type: 'bringForward',
    icon: <BringForWardIcon />,
    onClick: () => paintBoard.bringForWard()
  },
  {
    type: 'sendBackward',
    icon: <SendBackWardIcon />,
    onClick: () => paintBoard.seendBackWard()
  },
  {
    type: 'bringToFront',
    icon: <BringToFrontIcon />,
    onClick: () => paintBoard.bringToFront()
  },
  {
    type: 'sendToBack',
    icon: <SendToBackIcon />,
    onClick: () => paintBoard.sendToBack()
  }
]

const LayerConfig = () => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center mt-2">
      <div className="font-bold font-fredokaOne text-sm w-20 shrink-0 text-right">
        {t('title.layer')}
      </div>
      <ul className="menu menu-xs menu-vertical lg:menu-horizontal bg-base-100 rounded-box mt-1 flex-row w-max ml-3">
        {layerList.map((item) => (
          <li key={item.type}>
            <a onClick={item.onClick}>{item.icon}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LayerConfig
