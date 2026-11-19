import useDrawStore from '@/store/draw'
import { MaterialSwitch } from './constant'
import { useTranslation } from 'react-i18next'

const MaterialConfig = () => {
  const { materialType, updateMaterialType, drawColors, currentDrawColor } =
    useDrawStore()
  const { t } = useTranslation()

  return (
    <>
      <div className="mt-3">
        <div className="font-bold text-sm font-fredokaOne">
          {t('title.materialType')}
        </div>
        <div className="join mt-1 flex">
          {MaterialSwitch.map(({ type, image }, index) => (
            <button
              key={index}
              className={`join-item btn btn-xs flex-grow ${
                materialType === type ? 'btn-primary' : 'btn-neutral'
              }`}
              onClick={() => {
                updateMaterialType(type)
              }}
            >
              <img
                src={image}
                alt=""
                className={`w-5 h-3 opacity-60 rounded-sm`}
                style={{
                  backgroundColor: drawColors[currentDrawColor]
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default MaterialConfig
