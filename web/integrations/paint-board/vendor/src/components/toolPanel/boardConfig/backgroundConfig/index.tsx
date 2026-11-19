import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useFileStore, {
  DEFAULT_BACKGROUND_SORT,
  useCurrentFile
} from '@/store/files'
import Sortable from 'sortablejs'

import BackgroundImageConfig from './backgroundImageConfig'
import BackgroundColorConfig from './backgroundColorConfig'
import BackgroundCameraConfig from './backgroundCameraConfig'

const BackgroundConfig = () => {
  const { updateBackgroundSort } = useFileStore()
  const currentFile = useCurrentFile()
  if (!currentFile) {
    return null
  }
  const { t } = useTranslation()
  const sortableRef = useRef<HTMLDivElement>(null)

  // Initialize sortablejs
  useEffect(() => {
    if (sortableRef.current) {
      const sortable = new Sortable(sortableRef.current, {
        animation: 150,
        ghostClass: 'opacity-50',
        chosenClass: 'scale-105',
        dragClass: 'rotate-2',
        handle: '.drag-background-config-handle',
        onEnd: (evt) => {
          if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
            updateBackgroundSort(evt.oldIndex, evt.newIndex)
          }
        }
      })

      return () => {
        sortable.destroy()
      }
    }
  }, [updateBackgroundSort])

  return (
    <div className="form-control mt-3">
      <div className="font-bold font-fredokaOne text-sm">
        {t('title.canvasBackground')}
      </div>

      <div
        ref={sortableRef}
        className="flex flex-col gap-y-2 p-3 rounded-lg bg-slate-50 shadow-inner shadow-slate-200 mt-2"
      >
        {(currentFile.backgroundSort || DEFAULT_BACKGROUND_SORT).map((type) => {
          switch (type) {
            case 'image':
              return <BackgroundImageConfig key={type} />
            case 'color':
              return <BackgroundColorConfig key={type} />
            case 'camera':
              return <BackgroundCameraConfig key={type} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}

export default BackgroundConfig
