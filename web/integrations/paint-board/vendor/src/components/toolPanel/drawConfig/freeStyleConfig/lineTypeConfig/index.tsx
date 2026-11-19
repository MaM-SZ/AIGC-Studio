import useDrawStore from '@/store/draw'
import { useTranslation } from 'react-i18next'
import { drawLineTypeSwitch } from './constants'
import { FC } from 'react'

const LineTypeConfig: FC = () => {
  const { lineType, updateLineType } = useDrawStore()
  const { t } = useTranslation()

  return (
    <div className="mt-2">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.lineType')}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {drawLineTypeSwitch.map(({ type, icon }) => (
          <div
            key={type}
            className={`w-7 h-7 rounded-lg cursor-pointer bg-white flex items-center justify-center ${
              lineType === type
                ? 'ring-2 ring-primary'
                : 'hover:ring-2 ring-base-200'
            }`}
            onClick={() => {
              updateLineType(type)
            }}
          >
            {icon({})}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LineTypeConfig
