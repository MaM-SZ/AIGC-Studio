import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import { DrawTypeSwitch } from './constant'
import { DrawType } from '@/constants/draw'

import FreeDrawConfig from './freeStyleConfig'
import ShapeDrawConfig from './shapeConfig'

const DrawConfig = () => {
  const { t } = useTranslation()
  const { drawType, updateDrawType } = useBoardStore()

  return (
    <>
      <div className="font-bold text-sm font-fredokaOne mt-2">
        {t('title.drawType')}
      </div>
      <div className="join flex mt-1">
        {DrawTypeSwitch.map(({ type, text, keyboard }) => (
          <button
            key={type}
            className={`join-item btn btn-xs flex-grow font-fredokaOne font-normal gap-x-1 ${
              drawType === type ? 'btn-primary font-semibold' : 'btn-neutral'
            }`}
            onClick={() => {
              updateDrawType(type)
            }}
          >
            {t(text)}
            <span className="text-xs leading-none font-normal opacity-70 pt-1 font-sans xs:hidden">
              {keyboard}
            </span>
          </button>
        ))}
      </div>
      {drawType === DrawType.FreeStyle && <FreeDrawConfig />}
      {drawType === DrawType.Shape && <ShapeDrawConfig />}
    </>
  )
}

export default DrawConfig
