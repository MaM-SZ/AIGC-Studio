import { ActionMode } from '@/constants'

export const modeSwitch = [
  {
    type: ActionMode.DRAW,
    text: 'tool.draw',
    keyboard: '1'
  },
  {
    type: ActionMode.ERASE,
    text: 'tool.eraser',
    keyboard: '2'
  },
  {
    type: ActionMode.SELECT,
    text: 'tool.select',
    keyboard: '3'
  },
  {
    type: ActionMode.Board,
    text: 'tool.board',
    keyboard: '4'
  }
]
