import useFileStore, { useCurrentFile } from '@/store/files'
import { useTranslation } from 'react-i18next'

const CanvasSizeConfig = () => {
  const { updateCanvasWidth, updateCanvasHeight } = useFileStore()
  const currentFile = useCurrentFile()
  if (!currentFile) {
    return null
  }
  const { t } = useTranslation()

  return (
    <div className="form-control mt-3">
      <div className="font-bold font-fredokaOne text-sm">
        {t('title.canvasSize')}
      </div>
      <div className="mt-1 flex items-center w-full">
        <div className="text-sm font-fredokaOne w-12 mr-2 shrink-0">
          {t('canvasSize.width')}
        </div>
        <div className="text-sm font-fredokaOne mr-2 text-primary-focus w-9 shrink-0">
          {(currentFile.canvasWidth * 100).toFixed(0) + '%'}
        </div>
        <input
          className="range range-primary range-xs"
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={String(currentFile.canvasWidth)}
          onChange={(e) => {
            updateCanvasWidth(Number(e.target.value))
          }}
        />
      </div>
      <div className="mt-1 flex items-center w-full">
        <div className="text-sm font-fredokaOne w-12 mr-2 shrink-0">
          {t('canvasSize.height')}
        </div>
        <div className="text-sm font-fredokaOne mr-2 text-primary-focus w-9 shrink-0">
          {(currentFile.canvasHeight * 100).toFixed(0) + '%'}
        </div>
        <input
          className="range range-primary range-xs"
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={String(currentFile.canvasHeight)}
          onChange={(e) => {
            updateCanvasHeight(Number(e.target.value))
          }}
        />
      </div>
    </div>
  )
}

export default CanvasSizeConfig
