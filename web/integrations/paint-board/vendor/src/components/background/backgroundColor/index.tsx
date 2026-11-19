import React from 'react'
import { useCurrentFile } from '@/store/files'

const BackgroundColor: React.FC = () => {
  const currentFile = useCurrentFile()

  if (
    currentFile?.currentBackgroundColor === -1 ||
    !currentFile?.backgroundColorList?.length
  ) {
    return null
  }

  return (
    <div
      style={{
        background:
          currentFile.backgroundColorList[currentFile.currentBackgroundColor],
        width: `${currentFile.canvasWidth * 100}%`,
        height: `${currentFile.canvasHeight * 100}%`
      }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
    ></div>
  )
}

export default BackgroundColor
