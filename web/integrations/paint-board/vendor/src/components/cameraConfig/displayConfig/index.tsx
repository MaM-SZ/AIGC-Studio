import { useTranslation } from 'react-i18next'
import useCameraStore from '@/store/camera'
import { CAMERA_FILTER_TYPE } from '@/constants/camera'

const DisplayConfig = () => {
  const { t } = useTranslation()
  const {
    cameraBrightness,
    updateCameraBrightness,
    cameraContrast,
    updateCameraContrast,
    cameraSaturation,
    cameraOpacity,
    updateCameraOpacity,
    updateCameraSaturation,
    cameraFilter,
    updateCameraFilter,
    resetCameraConfig
  } = useCameraStore()

  return (
    <dialog id="display-config-modal" className="modal">
      <div className="modal-box opacity-75 w-96">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        <div className="flex items-center mt-2">
          <span className="font-bold text-sm mr-2 shrink-0 w-32">
            {t('camera.displayConfig.brightness')}
          </span>
          <input
            type="range"
            className="range range-success range-sm w-36"
            min={0.1}
            max={2}
            step={0.1}
            value={cameraBrightness}
            onChange={(e) => updateCameraBrightness(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center mt-2">
          <span className="font-bold text-sm mr-2 shrink-0 w-32">
            {t('camera.displayConfig.contrast')}
          </span>
          <input
            type="range"
            className="range range-success range-sm w-36"
            min={0.1}
            max={2}
            step={0.1}
            value={cameraContrast}
            onChange={(e) => updateCameraContrast(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center mt-2">
          <span className="font-bold text-sm mr-2 shrink-0 w-32">
            {t('camera.displayConfig.saturation')}
          </span>
          <input
            type="range"
            className="range range-success range-sm w-36"
            min={0.1}
            max={2}
            step={0.1}
            value={cameraSaturation}
            onChange={(e) => updateCameraSaturation(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center mt-2">
          <span className="font-bold text-sm mr-2 shrink-0 w-32">
            {t('camera.displayConfig.opacity')}
          </span>
          <input
            type="range"
            className="range range-success range-sm w-36"
            min={0.1}
            max={1}
            step={0.01}
            value={cameraOpacity}
            onChange={(e) => updateCameraOpacity(Number(e.target.value))}
          />
        </div>
        <div className="flex mt-2">
          <span className="font-bold text-sm mr-2 shrink-0 w-32">
            {t('camera.displayConfig.filter.title')}
          </span>
          <div className="flex flex-wrap gap-x-2 gap-y-1 w-48">
            {Object.values(CAMERA_FILTER_TYPE).map((filter) => (
              <label
                className={`inline-flex items-center mt-1 cursor-pointer w-auto`}
                key={filter}
              >
                <div className="text-xs mr-2">
                  {t(`camera.displayConfig.filter.${filter}`)}
                </div>
                <input
                  type="radio"
                  name="radio-5"
                  className="radio radio-success radio-xs"
                  checked={cameraFilter === filter}
                  onChange={() => {
                    updateCameraFilter(filter)
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-start mt-4">
          <button
            className="btn btn-primary btn-xs"
            onClick={resetCameraConfig}
          >
            {t('camera.displayConfig.reset')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default DisplayConfig
