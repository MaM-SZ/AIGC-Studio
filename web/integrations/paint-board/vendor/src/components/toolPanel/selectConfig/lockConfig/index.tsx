import { useMemo, FC } from 'react'
import { paintBoard } from '@/core/paintBoard'
import { useTranslation } from 'react-i18next'
import { isObjectLocked } from '@/core/utils/object'

import { CircleQuestionMark } from 'lucide-react'

interface IProps {
  refreshCount: number
}

const LockConfig: FC<IProps> = ({ refreshCount }) => {
  const { t } = useTranslation()

  const lockControl = useMemo(() => {
    let show = false
    let lock = false
    const objects = paintBoard.canvas?.getActiveObjects()

    if (objects?.length) {
      show = true
      lock = objects?.every((obj) => isObjectLocked(obj))
    }

    return {
      show,
      lock
    }
  }, [refreshCount])

  const updateObjectLock = () => {
    const objects = paintBoard.canvas?.getActiveObjects()
    if (objects?.length) {
      const lock = !lockControl.lock

      objects?.forEach((obj) => {
        obj.set({
          lockMovementX: lock,
          lockMovementY: lock,
          lockRotation: lock,
          lockScalingX: lock,
          lockScalingY: lock,
          lockUniScaling: lock,
          hasControls: !lock
        })
      })
      paintBoard.canvas?.discardActiveObject()
      paintBoard.render()
    }
  }

  if (!lockControl.show) {
    return null
  }

  return (
    <div className="flex items-center mt-3">
      <div className="font-bold font-fredokaOne text-sm flex items-center justify-end w-20 shrink-0">
        {t('lockConfig.lock')}
        <div
          className="tooltip tooltip-right ml-1 cursor-pointer before:max-w-24"
          data-tip={t('lockConfig.lockTip')}
        >
          <CircleQuestionMark size={16} />
        </div>
      </div>
      <input
        type="checkbox"
        className="toggle toggle-success toggle-sm ml-3"
        checked={lockControl.lock}
        onChange={updateObjectLock}
      />
    </div>
  )
}

export default LockConfig
