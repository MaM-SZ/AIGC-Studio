import useShapeStore from '@/store/shape'
import { useTranslation } from 'react-i18next'

const StrokeWidthConfig = () => {
  const { t } = useTranslation()
  const { strokeWidth, updateStrokeWidth } = useShapeStore()

  return (
    <div className="mt-3">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.strokeWidth')}
      </div>
      <div className="flex items-center">
        <div className="text-lg font-fredokaOne mr-2 text-primary-focus">
          {strokeWidth}
        </div>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={strokeWidth}
          className="range range-primary range-xs"
          onChange={(e) => updateStrokeWidth(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

export default StrokeWidthConfig
