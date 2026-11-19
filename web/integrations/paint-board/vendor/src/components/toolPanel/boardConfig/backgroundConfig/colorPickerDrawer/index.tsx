import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useFileStore, { useCurrentFile } from '@/store/files'

import ColorPicker from 'react-best-gradient-color-picker'

interface IProps {
  colorIndex: number
  setVisible: (show: boolean) => void
}

const ColorPickerDrawer: React.FC<IProps> = ({ colorIndex, setVisible }) => {
  const { t } = useTranslation()
  const { updateBackgroundColor } = useFileStore()
  const currentFile = useCurrentFile()

  if (!currentFile) {
    return null
  }

  const [color, setColor] = useState(
    currentFile?.backgroundColorList?.[colorIndex] || ''
  )

  const handleConfirm = () => {
    setVisible(false)
    updateBackgroundColor(colorIndex, color)
  }

  return (
    <div className="drawer drawer-end">
      <input
        id="color-picker-drawer"
        type="checkbox"
        className="drawer-toggle"
      />
      <div className="drawer-side z-[11]">
        <label
          htmlFor="color-picker-draw"
          className="drawer-overlay"
          onClick={() => setVisible(false)}
        ></label>
        <div className="h-screen bg-white px-4 py-6 overflow-y-auto max-w-[95%]">
          <div className="flex gap-x-2 mb-3">
            <button
              className="btn btn-ghost btn-outline btn-sm"
              onClick={() => setVisible(false)}
            >
              {t('cancel')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
              {t('confirm')}
            </button>
          </div>
          <div className="p-3 rounded-md bg-[#222]">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorPickerDrawer
