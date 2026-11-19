import { useMemo, FC } from 'react'
import { paintBoard } from '@/core/paintBoard'
import { useTranslation } from 'react-i18next'

import { CircleQuestionMark } from 'lucide-react'

interface IProps {
  refreshCount: number
}

const EraserConfig: FC<IProps> = ({ refreshCount }) => {
  const { t } = useTranslation()

  const erasableControl = useMemo(() => {
    let show = false
    let erasable = true
    const objects = paintBoard.canvas?.getActiveObjects()

    if (objects?.length) {
      show = true
      erasable = !objects?.every((obj) => obj?.erasable === false)
    }

    return {
      show,
      erasable
    }
  }, [refreshCount])

  const updateObjectErasable = () => {
    const objects = paintBoard.canvas?.getActiveObjects()
    if (objects?.length) {
      objects?.forEach((obj) => {
        obj.erasable = !erasableControl.erasable
      })
      paintBoard.canvas?.fire('selection:updated')
      paintBoard.render()
    }
  }

  if (!erasableControl.show) {
    return null
  }

  return (
    <div className="flex items-center mt-2">
      <div className="font-bold font-fredokaOne text-sm flex items-center justify-end shrink-0 w-20">
        {t('eraserConfig.eraser')}
        <div
          className="tooltip tooltip-right ml-1 cursor-pointer before:max-w-24"
          data-tip={t('eraserConfig.erasableTip')}
        >
          <CircleQuestionMark size={16} />
        </div>
      </div>
      <input
        type="checkbox"
        className="toggle toggle-success toggle-sm ml-3"
        checked={erasableControl.erasable}
        onChange={updateObjectErasable}
      />
    </div>
  )
}

export default EraserConfig
