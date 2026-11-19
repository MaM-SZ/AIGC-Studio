import { paintBoard } from '@/core/paintBoard'

/**
 * History operations handler
 * Handles undo and redo operations
 */
export class HistoryHandler {
  /**
   * Undo last action
   */
  undoAction() {
    if (paintBoard?.history) {
      paintBoard.history.undo()
      console.log('Undo action executed')
    } else {
      console.warn('History not available for undo')
    }
  }

  /**
   * Redo next action
   */
  redoAction() {
    if (paintBoard?.history) {
      paintBoard.history.redo()
      console.log('Redo action executed')
    } else {
      console.warn('History not available for redo')
    }
  }
}
