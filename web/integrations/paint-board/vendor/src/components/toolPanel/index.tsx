import { useState, FC } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { modeSwitch } from './constant'

import { X, Menu } from 'lucide-react'
import DrawConfig from './drawConfig'
import EraserConfig from './eraserConfig'
import SelectConfig from './selectConfig'
import BoardConfig from './boardConfig'

const ToolPanel: FC = () => {
  const { t } = useTranslation()
  const { mode, updateMode } = useBoardStore()
  const [showPanel, setShowPanel] = useState(true) // toggle main panel display

  return (
    <div
      className={`fixed top-7 left-7 flex flex-col card shadow-xl overflow-visible z-[3] bg-[#eef1ff] max-h-[80%] max-w-[85%] ${
        showPanel ? 'p-4' : ''
      }`}
    >
      {/* toggle main panel display button */}
      <label className="btn btn-neutral btn-circle swap swap-rotate absolute -top-3 -left-3 h-7 w-7 min-h-0">
        <input type="checkbox" onChange={() => setShowPanel((v) => !v)} />
        <Menu
          strokeWidth={2.5}
          color="#fff"
          size={20}
          className="swap-on fill-current"
        />
        <X
          strokeWidth={2.5}
          color="#fff"
          size={20}
          className="swap-off fill-current"
        />
      </label>
      {showPanel && (
        <div className="max-h-[100%] overflow-y-auto noScrollbar p-1">
          {/* switch mode tabs */}
          <div className="tabs tabs-sm tabs-boxed bg-[#333C4D]">
            {modeSwitch.map(({ type, text, keyboard }) => (
              <a
                key={type}
                className={`tab flex-grow font-fredokaOne text-white font-medium ${
                  mode === type ? 'tab-active' : 'hover:text-base-300'
                }`}
                onClick={() => {
                  updateMode(type)
                }}
              >
                {t(text)}
                <span className="ml-1 text-xs leading-none font-normal opacity-70 pt-1 font-sans xs:hidden">
                  {keyboard}
                </span>
              </a>
            ))}
          </div>
          {mode === ActionMode.DRAW && <DrawConfig />}
          {mode === ActionMode.ERASE && <EraserConfig />}
          {mode === ActionMode.SELECT && <SelectConfig />}
          {mode === ActionMode.Board && <BoardConfig />}
        </div>
      )}
    </div>
  )
}

export default ToolPanel
