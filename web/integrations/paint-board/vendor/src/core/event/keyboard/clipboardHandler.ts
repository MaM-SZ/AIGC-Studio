import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import { ImageElement } from '@/core/element/image'
import { ActionMode } from '@/constants'
import useBoardStore from '@/store/board'
import { cloneObjects, filterUnlockedObjects } from '@/core/utils/object'

/**
 * Clipboard operations handler
 * Handles copy, paste operations for objects, images, and text
 */
export class ClipboardHandler {
  private copiedObjects: fabric.Object[] = [] // stored replicated objects

  /**
   * Select all objects on canvas (excluding locked objects)
   */
  selectAllObjects() {
    const canvas = paintBoard?.canvas
    if (!canvas) return

    // get all objects on the canvas
    const allObjects = canvas.getObjects()

    if (allObjects.length === 0) {
      console.log('No objects to select')
      return
    }

    // filter out locked objects
    const unlockedObjects = filterUnlockedObjects(allObjects)

    if (unlockedObjects.length === 0) {
      console.log('No unlocked objects to select')
      return
    }

    // if there is only one unlocked object, select it directly
    if (unlockedObjects.length === 1) {
      canvas.setActiveObject(unlockedObjects[0])
    } else {
      // if there are multiple unlocked objects, create an active selection group
      const activeSelection = new fabric.ActiveSelection(unlockedObjects, {
        canvas: canvas
      })
      canvas.setActiveObject(activeSelection)
    }

    useBoardStore.getState().updateMode(ActionMode.SELECT)

    // re-render the canvas
    canvas.renderAll()
    console.log(
      `Selected ${unlockedObjects.length} unlocked objects (${
        allObjects.length - unlockedObjects.length
      } locked objects excluded)`
    )
  }

  /**
   * Copy selected objects
   */
  copySelectedObjects() {
    const canvas = paintBoard?.canvas
    if (!canvas) return

    const activeObjects = canvas.getActiveObjects()
    if (!activeObjects.length) {
      console.log('No object selected to copy')
      return
    }
    this.copiedObjects = activeObjects
  }

  /**
   * Handle paste from clipboard (images/text) or copied objects
   */
  async pasteClipboard() {
    const canvas = paintBoard?.canvas
    if (!canvas) return

    try {
      const clipboardContents = await navigator.clipboard.read()
      console.log('Clipboard contents:', clipboardContents)

      if (!clipboardContents.length) {
        console.log('No clipboard contents found')
        return
      }

      // handle image
      for (const item of clipboardContents) {
        console.log('Clipboard item types:', item.types)

        // check if there is image type
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (imageType) {
          console.log('Found image type:', imageType)
          try {
            const blob = await item.getType(imageType)
            console.log('Image blob:', blob)

            if (blob && blob.size > 0) {
              const reader = new FileReader()
              reader.onload = (event) => {
                const data = event.target?.result
                console.log(
                  'Image data loaded:',
                  typeof data,
                  data?.toString().substring(0, 50)
                )
                if (data && typeof data === 'string') {
                  const image = new ImageElement()
                  image.addImage(data)
                }
              }
              reader.onerror = (error) => {
                console.error('FileReader error:', error)
              }
              reader.readAsDataURL(blob)
              return
            }
          } catch (error) {
            console.error('Error reading image from clipboard:', error)
          }
        }
      }

      // if there is no image, handle text
      for (const item of clipboardContents) {
        if (item.types.includes('text/plain')) {
          console.log('Found text type')
          try {
            const textBlob = await item.getType('text/plain')
            if (textBlob) {
              const text = await textBlob.text()
              console.log('Text content:', text)
              if (text && text.trim()) {
                paintBoard.textElement?.loadText({
                  text
                })
                useBoardStore.getState().updateMode(ActionMode.SELECT)
                return
              }
            }
          } catch (error) {
            console.error('Error reading text from clipboard:', error)
          }
        }
      }

      console.log('No suitable clipboard content found')
    } catch (error) {
      console.error('Error accessing clipboard:', error)
    }
  }

  /**
   * Paste copied objects
   */
  async pasteObjects() {
    const canvas = paintBoard?.canvas
    if (!canvas || this.copiedObjects.length === 0) {
      console.log('No objects to paste')
      return
    }

    useBoardStore.getState().updateMode(ActionMode.SELECT)
    cloneObjects(this.copiedObjects)
  }
}
