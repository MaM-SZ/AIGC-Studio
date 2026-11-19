import debounce from 'lodash-es/debounce'
import { useState } from 'react'
import useShapeStore from '@/store/shape'
import { useTranslation } from 'react-i18next'

import AddColorIcon from '@/components/icons/addColor.svg?react'
import ClearIcon from '@/components/icons/clear.svg?react'
import EditIcon from '@/components/icons/edit.svg?react'

const FillColorConfig = () => {
  const {
    fillColorList,
    currentFillColor,
    updateFillColor,
    deleteFillColor,
    updateCurrentFillColor
  } = useShapeStore()
  const { t } = useTranslation()
  const [editColorIndex, setEditColorIndex] = useState(-1)

  const handleFillColor = debounce((color: string, colorIndex: number) => {
    updateFillColor(color, colorIndex)
  }, 100)

  return (
    <div className="form-control mt-3">
      <div className="font-bold text-sm font-fredokaOne">
        {t('title.fillColor')}
      </div>
      <div className="mt-2 pb-1 flex items-center gap-x-2 w-full relative">
        {fillColorList.map((fillColor, fillColorIndex) => (
          <div
            className={`relative w-6 h-6 transition-all duration-300 ${
              currentFillColor === fillColorIndex ? 'w-7' : ''
            }`}
            key={fillColor + fillColorIndex}
          >
            <div
              className={`absolute top-0 left-0 shrink-0 flex items-center justify-between w-6 bg-gray-200 overflow-hidden join hover:w-20 hover:z-10 transition-all duration-300 ring-offset-1 ${
                currentFillColor === fillColorIndex
                  ? 'ring-2 ring-primary mx-1'
                  : 'hover:ring-2 ring-base-200'
              }`}
            >
              <div
                className={`shrink-0 w-6 h-6 rounded-sm cursor-pointer join-item`}
                style={{ background: fillColor }}
                onClick={() => {
                  updateCurrentFillColor(fillColorIndex)
                }}
              ></div>
              <label
                htmlFor="shape-fill-color-input"
                onClick={() => {
                  setEditColorIndex(fillColorIndex)
                }}
              >
                <EditIcon
                  className={`shrink-0 w-5 h-5 cursor-pointer join-item hover:opacity-80`}
                />
              </label>
              <ClearIcon
                className={`shrink-0 w-4 h-4 mr-1 cursor-pointer join-item hover:opacity-80`}
                onClick={() => {
                  deleteFillColor(fillColorIndex)
                }}
              />
            </div>
          </div>
        ))}
        {fillColorList.length < 6 && (
          <AddColorIcon
            className="w-6 h-6 cursor-pointer hover:opacity-60"
            onClick={() => {
              updateFillColor('#000000', fillColorList.length)
            }}
          />
        )}
        <input
          id="shape-fill-color-input"
          type="color"
          value={
            editColorIndex >= 0 ? fillColorList[editColorIndex] : '#000000'
          }
          onChange={(e) => {
            if (editColorIndex >= 0) {
              handleFillColor(e.target.value, editColorIndex)
            }
          }}
          className={`w-0 h-0 opacity-0 absolute top-7 left-${
            editColorIndex * 7
          }`}
        />
      </div>
    </div>
  )
}

export default FillColorConfig
