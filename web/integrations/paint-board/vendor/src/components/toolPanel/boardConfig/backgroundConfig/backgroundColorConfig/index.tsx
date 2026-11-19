import { useState } from 'react'
import useFileStore, { useCurrentFile } from '@/store/files'

import { Palette, GripVertical } from 'lucide-react'
import ColorPickerDrawer from '../colorPickerDrawer'
import ClearIcon from '@/components/icons/clear.svg?react'
import EditIcon from '@/components/icons/edit.svg?react'
import AddColorIcon from '@/components/icons/addColor.svg?react'

const BackgroundConfig = () => {
  const { updateCurrentBackgroundColor, deleteBackgroundColor } = useFileStore()
  const currentFile = useCurrentFile()
  if (!currentFile) {
    return null
  }

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorIndex, setColorIndex] = useState(-1)

  return (
    <div className="flex items-center w-full group">
      <Palette size={20} color="#66CC8A" className="shrink-0" />
      <div className="divider divider-horizontal mx-1 shrink-0"></div>
      <div className="flex items-center gap-x-1">
        {currentFile.backgroundColorList.map(
          (backgroundColor, backgroundColorIndex) => (
            <div
              className={`relative w-5 h-5 transition-all duration-300 ${
                backgroundColorIndex === currentFile.currentBackgroundColor
                  ? 'w-7'
                  : ''
              }`}
              key={backgroundColor + backgroundColorIndex}
            >
              <div
                className={`absolute top-0 left-0 shrink-0 flex items-center gap-x-1 w-5 bg-gray-200 overflow-hidden join hover:w-16 hover:z-10 transition-all duration-300 ring-offset-1 ${
                  backgroundColorIndex === currentFile.currentBackgroundColor
                    ? 'ring-2 ring-primary mx-1'
                    : 'hover:ring-2 ring-base-200'
                }`}
              >
                <div
                  className={`shrink-0 w-5 h-5 rounded-sm cursor-pointer join-item`}
                  style={{ background: backgroundColor }}
                  onClick={() => {
                    updateCurrentBackgroundColor(backgroundColorIndex)
                  }}
                ></div>
                <label
                  htmlFor="color-picker-drawer"
                  onClick={() => {
                    setShowColorPicker(true)
                    setColorIndex(backgroundColorIndex)
                  }}
                >
                  <EditIcon
                    className={`shrink-0 w-5 h-5 cursor-pointer join-item hover:opacity-80`}
                  />
                </label>
                <ClearIcon
                  className={`shrink-0 w-4 h-4 cursor-pointer join-item hover:opacity-80`}
                  onClick={() => {
                    deleteBackgroundColor(backgroundColorIndex)
                  }}
                />
              </div>
            </div>
          )
        )}
        {currentFile.backgroundColorList.length < 5 && (
          <label
            htmlFor="color-picker-drawer"
            onClick={() => {
              setShowColorPicker(true)
              setColorIndex(currentFile.backgroundColorList.length)
            }}
          >
            <AddColorIcon className="w-5 h-5 cursor-pointer hover:opacity-60" />
          </label>
        )}
      </div>
      <GripVertical
        size={20}
        color="#66CC8A"
        className="drag-background-config-handle shrink-0 cursor-pointer ml-auto hidden xs:inline-block group-hover:inline-block"
      />

      {showColorPicker && (
        <ColorPickerDrawer
          colorIndex={colorIndex}
          setVisible={setShowColorPicker}
        />
      )}
    </div>
  )
}

export default BackgroundConfig
