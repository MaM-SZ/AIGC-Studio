import {
  KeyCodeDrawStyleMap,
  KeyCodeDrawTypeMap,
  KeyCodeModeMap
} from '@/constants/event'
import { ActionMode } from '@/constants'

import useBoardStore from '@/store/board'
import useDrawStore from '@/store/draw'
import { DrawType } from '@/constants/draw'

/**
 * Mode switching handler
 * Handles tool mode switching and deletion operations
 */
export class ModeHandler {
  /**
   * Switch tool mode based on number key
   */
  switchMode(keyCode: string) {
    const mode = KeyCodeModeMap[keyCode as keyof typeof KeyCodeModeMap]
    if (mode) {
      useBoardStore.getState().updateMode(mode)
    }
  }

  switchDrawType(keyCode: string) {
    const mode = useBoardStore.getState().mode
    if (mode !== ActionMode.DRAW) {
      return
    }

    const drawType =
      KeyCodeDrawTypeMap[keyCode as keyof typeof KeyCodeDrawTypeMap]
    if (drawType) {
      useBoardStore.getState().updateDrawType(drawType)
    }
  }

  switchDrawStyle(keyCode: string) {
    const { mode, drawType } = useBoardStore.getState()
    if (mode !== ActionMode.DRAW || drawType !== DrawType.FreeStyle) {
      return
    }

    const drawStyle =
      KeyCodeDrawStyleMap[keyCode as keyof typeof KeyCodeDrawStyleMap]
    if (drawStyle) {
      useDrawStore.getState().updateDrawStyle(drawStyle)
    }
  }
}
