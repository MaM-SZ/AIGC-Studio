import useCameraStore from '@/store/camera'
import { useTranslation } from 'react-i18next'

import { Camera, GripVertical } from 'lucide-react'

const BackgroundConfig = () => {
  const { t } = useTranslation()
  const { cameraOpacity, updateCameraOpacity } = useCameraStore()

  return (
    <div className="flex items-center w-full group">
      <span
        className="shrink-0 tooltip tooltip-right"
        data-tip={t('camera.openTip')}
      >
        <Camera color="#66CC8A" size={20} />
      </span>
      <div className="divider divider-horizontal mx-1 shrink-0"></div>
      <input
        className="range range-primary range-xs w-32"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={String(cameraOpacity)}
        onChange={(e) => {
          updateCameraOpacity(Number(e.target.value))
        }}
      />
      <GripVertical
        size={20}
        color="#66CC8A"
        className="drag-background-config-handle cursor-pointer ml-auto hidden xs:inline-block group-hover:inline-block"
      />
    </div>
  )
}

export default BackgroundConfig
