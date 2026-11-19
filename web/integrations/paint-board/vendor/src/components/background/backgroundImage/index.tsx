import React from 'react'
import { useCurrentFile } from '@/store/files'

const BackgroundImage: React.FC = () => {
  const currentFile = useCurrentFile()
  if (!currentFile?.backgroundImage) {
    return null
  }

  return (
    <img
      style={{
        width: `${currentFile.canvasWidth * 100}%`,
        height: `${currentFile.canvasHeight * 100}%`,
        opacity: currentFile.backgroundImageOpacity
      }}
      src={currentFile.backgroundImage}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1 object-contain"
    ></img>
  )
}

export default BackgroundImage
