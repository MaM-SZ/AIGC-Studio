import { fabric } from 'fabric'
import { ActionMode } from '@/constants'
import { DrawType } from '@/constants/draw'
import { paintBoard } from '@/core/paintBoard'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { alignGuideLine } from '@/core/fabricMixin/alignGuideLine'
import { getInitLanguage } from '@/i18n/utils'

interface BoardState {
  mode: string // operating mode
  drawType: string // draw type
  language: string // i18n language 'zh' 'en'
  isObjectCaching: boolean // fabric objectCaching
  openGuideLine: boolean // does the guide line show
}

interface BoardAction {
  updateMode: (mode: string) => void
  updateDrawType: (drawType: string) => void
  updateLanguage: (language: string) => void
  updateCacheState: () => void
  updateOpenGuideLine: () => void
}

const initLanguage = getInitLanguage()

const useBoardStore = create<BoardState & BoardAction>()(
  persist(
    (set, get) => ({
      mode: ActionMode.DRAW,
      drawType: DrawType.FreeStyle,
      language: initLanguage,
      isObjectCaching: true,
      openGuideLine: false,
      updateMode: (mode) => {
        const oldMode = get().mode
        if (oldMode !== mode) {
          paintBoard.handleMode(mode)
          set({
            mode
          })
        }
      },
      updateDrawType: (drawType) => {
        const oldDrawType = get().drawType
        if (oldDrawType !== drawType) {
          set({
            drawType
          })
          paintBoard.handleMode()
        }
      },
      updateLanguage(language) {
        set({
          language
        })
      },
      updateCacheState() {
        const oldCacheState = get().isObjectCaching
        set({
          isObjectCaching: !oldCacheState
        })
        fabric.Object.prototype.set({
          objectCaching: useBoardStore.getState().isObjectCaching
        })
        paintBoard?.canvas?.renderAll()
      },
      updateOpenGuideLine() {
        const newOpenGuideLine = !get().openGuideLine
        set({
          openGuideLine: newOpenGuideLine
        })
        alignGuideLine.updateOpenState(newOpenGuideLine)
      }
    }),
    {
      name: 'PAINT-BOARD-STORE'
    }
  )
)
export default useBoardStore
