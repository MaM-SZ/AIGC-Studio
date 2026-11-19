import useShapeStore from '@/store/shape'
import { useTranslation } from 'react-i18next'
import { fillStyleSwitch } from './constants'
import { FC, useMemo } from 'react'
import { StrokeStyleType } from '@/constants/shape'

interface IProps {
  fillStyle?: string
  updateFillStyle?: (fillStyle: string) => void
}

const FillStyleConfig: FC<IProps> = (props) => {
  const { strokeStyle, fillStyle, updateFillStyle } = useShapeStore()
  const { t } = useTranslation()

  const filterFillStyleSwitch = useMemo(() => {
    if (strokeStyle !== StrokeStyleType.Sketch) {
      return fillStyleSwitch.filter(({ isSketch }) => !isSketch)
    }
    return fillStyleSwitch
  }, [strokeStyle])

  return (
    <div className="mt-3">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.fillStyle')}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {filterFillStyleSwitch.map(({ type, icon }) => (
          <div
            key={type}
            className={`w-7 h-7 rounded-lg cursor-pointer bg-white  flex items-center justify-center ${
              fillStyle === type
                ? 'ring-2 ring-primary'
                : 'hover:ring-2 ring-base-200'
            }`}
            onClick={() => {
              updateFillStyle(type)
              props?.updateFillStyle?.(type)
            }}
          >
            {icon({
              className: 'w-4 h-4 text-black fill-black stroke-black'
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FillStyleConfig
