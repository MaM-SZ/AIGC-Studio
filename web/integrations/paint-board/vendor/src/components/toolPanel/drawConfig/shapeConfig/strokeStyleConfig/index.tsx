import useShapeStore from '@/store/shape'
import { useTranslation } from 'react-i18next'
import { strokeStyleSwitch } from './constants'
import { FC, useMemo } from 'react'
import { SHAPE_ELEMENT_CUSTOM_TYPE } from '@/constants'
import { StrokeStyleType } from '@/constants/shape'

const StrokeStyleConfig: FC = () => {
  const { strokeStyle, updateStrokeStyle, currentShapeIcon } = useShapeStore()
  const { t } = useTranslation()

  const filterStrokeStyleSwitch = useMemo(() => {
    switch (currentShapeIcon) {
      case SHAPE_ELEMENT_CUSTOM_TYPE.SHAPE_LINE:
      case SHAPE_ELEMENT_CUSTOM_TYPE.SHAPE_ARROW_LINE:
        return strokeStyleSwitch.filter(
          ({ type }) => type !== StrokeStyleType.Sketch
        )
      default:
        return strokeStyleSwitch
    }
  }, [currentShapeIcon])

  return (
    <div className="mt-3">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.strokeStyle')}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {filterStrokeStyleSwitch.map(({ type, icon }) => (
          <div
            key={type}
            className={`w-7 h-7 rounded-lg cursor-pointer bg-white flex items-center justify-center ${
              strokeStyle === type
                ? 'ring-2 ring-primary'
                : 'hover:ring-2 ring-base-200'
            }`}
            onClick={() => {
              updateStrokeStyle(type)
            }}
          >
            {icon({})}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StrokeStyleConfig
