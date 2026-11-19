import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useCameraStore from '@/store/camera'

import { Settings2 } from 'lucide-react'
import DisplayConfig from './displayConfig'
import Toast from '../toast'
import CountDown from './countDown'

const CameraConfig = () => {
  const { t } = useTranslation()
  const { openCamera, updateOpenCamera, pauseCamera, updatePauseCamera } =
    useCameraStore()
  const [showCameraTip, updateShowCameraTip] = useState(false)
  const [openCameraCountdown, setOpenCameraCountdown] = useState(false)

  const handleOpenCamera = async () => {
    const status = await navigator?.permissions?.query({
      name: 'camera'
    })

    if (status?.state === 'denied') {
      updateShowCameraTip(true)
      setTimeout(() => {
        updateShowCameraTip(false)
      }, 2000)
      return
    }

    updateOpenCamera(!openCamera)
  }

  const handleCountDown = () => {
    if (pauseCamera) {
      updatePauseCamera(false)
    } else {
      setOpenCameraCountdown(true)
    }
  }

  const handleCountDownDone = () => {
    updatePauseCamera(true)
    setOpenCameraCountdown(false)
  }

  return (
    <div className="dropdown dropdown-top dropdown-hover w-7 h-7 ml-2">
      <div
        tabIndex={0}
        role="button"
        className="flex items-center justify-center rounded-full w-7 h-7 cursor-pointer bg-[#eef1ff]"
      >
        {openCamera ? (
          <>
            <span className="animate-pulse absolute inline-flex h-7 w-7 rounded-full bg-[#ff586180]"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff5861] z-10"></span>
          </>
        ) : (
          <>
            <span className="absolute inline-flex h-7 w-7 rounded-full bg-[#66CC8A40]"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#66CC8A] z-10"></span>
          </>
        )}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[11] shadow"
      >
        <li>
          <a className="p-0">
            <label className="label cursor-pointer flex items-center justify-start gap-x-1 w-28">
              <span className="shrink-0">{t('camera.openCamera')}</span>
              <input
                type="checkbox"
                className={`toggle toggle-sm toggle-primary`}
                checked={openCamera}
                onChange={handleOpenCamera}
              />
            </label>
          </a>
        </li>
        {openCamera && (
          <li>
            <a className="p-0">
              <label className="label cursor-pointer flex items-center justify-start gap-x-1 w-32">
                <span className="shrink-0">{t('camera.freezeFrame')}</span>
                <input
                  type="checkbox"
                  className={`toggle toggle-sm toggle-primary`}
                  checked={pauseCamera}
                  onChange={() => handleCountDown()}
                />
              </label>
            </a>
          </li>
        )}
        <li>
          <a
            className="p-1 gap-x-1"
            onClick={() => {
              ;(
                document.getElementById(
                  'display-config-modal'
                ) as HTMLDialogElement
              )?.showModal()
            }}
          >
            <span className="text-nowrap">
              {t('camera.displayConfig.title')}
            </span>
            <Settings2 size={20} />
          </a>
        </li>
      </ul>
      <DisplayConfig />

      {showCameraTip && (
        <Toast message="tip.cameraPermissionDenied" type="error" />
      )}

      {/* countdown animation */}
      {openCameraCountdown && (
        <CountDown onDone={() => handleCountDownDone()} />
      )}
    </div>
  )
}

export default CameraConfig
