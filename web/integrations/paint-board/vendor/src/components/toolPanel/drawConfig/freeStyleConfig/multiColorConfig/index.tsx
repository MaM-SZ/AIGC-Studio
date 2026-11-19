import useDrawStore from '@/store/draw'
import { MultiColorType } from '@/core/element/draw/multiColor'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

const MultiColorSwitch = [
  MultiColorType.COL,
  MultiColorType.ROW,
  MultiColorType.CIRCLE
]

const MultiColorConfig = () => {
  const {
    multiColorType,
    updateMultiColorType,
    drawColors,
    currentMultiColor
  } = useDrawStore()
  const { t } = useTranslation()
  const filteredDrawColors = useMemo(() => {
    return drawColors.filter((_, index) => currentMultiColor.includes(index))
  }, [drawColors, currentMultiColor])

  return (
    <div className="mt-2">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.multiColorType')}
      </div>
      <div className="join flex mt-1">
        {MultiColorSwitch.map((item, index) => (
          <button
            key={index}
            className={`join-item btn btn-xs flex-grow ${
              multiColorType === item ? 'btn-primary' : 'btn-neutral'
            }`}
            onClick={() => {
              updateMultiColorType(item)
            }}
          >
            {item === MultiColorType.COL && (
              <div className="flex w-4/6 h-4/6 rounded-lg overflow-hidden ">
                {filteredDrawColors.map((color, index) => (
                  <div
                    className="h-full flex-1"
                    style={{
                      backgroundColor: color
                    }}
                    key={index}
                  ></div>
                ))}
              </div>
            )}
            {item === MultiColorType.ROW && (
              <div className="flex flex-col w-4/6 h-4/6 rounded-lg overflow-hidden ">
                {filteredDrawColors.map((color, index) => (
                  <div
                    className="h-full flex-1"
                    style={{
                      backgroundColor: color
                    }}
                    key={index}
                  ></div>
                ))}
              </div>
            )}
            {item === MultiColorType.CIRCLE && (
              <div className="w-4/6 h-4/6 relative">
                {filteredDrawColors.map((color, index) => (
                  <div
                    className="h-4 w-4 rounded-full absolute top-0"
                    style={{
                      backgroundColor: color,
                      left: `${index * 5}px`
                    }}
                    key={index}
                  ></div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MultiColorConfig
