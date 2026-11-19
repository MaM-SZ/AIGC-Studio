import React from 'react'

import InfoIcon from '@/components/icons/info.svg?react'
import ZoomInfo from '../zoomInfo'
import CameraConfig from '../cameraConfig'
import HelpModal from './helpModal'

const HelpArea: React.FC = () => {
  return (
    <>
      <div className="z-[4] fixed bottom-5 left-5 flex flex-row justify-center items-center px-2.5 py-1.5 rounded-full bg-[#eef1ff]">
        <InfoIcon
          className="bg-white rounded-full cursor-pointer hover:opacity-70"
          onClick={() => {
            ;(
              document.getElementById('help-modal') as HTMLDialogElement
            ).showModal()
          }}
        />
        <ZoomInfo />
        <CameraConfig />
      </div>

      <HelpModal />
    </>
  )
}

export default HelpArea
