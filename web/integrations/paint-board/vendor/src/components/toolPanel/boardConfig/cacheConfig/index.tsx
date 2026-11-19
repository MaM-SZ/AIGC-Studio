import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'

import { CircleQuestionMark } from 'lucide-react'

const CacheConfig = () => {
  const { t } = useTranslation()
  const { isObjectCaching, updateCacheState } = useBoardStore()

  return (
    <div className="form-control mt-3">
      <div className="flex items-center font-bold font-fredokaOne text-sm">
        {t('title.drawCache')}
        <div
          className="tooltip tooltip-top ml-1 cursor-pointer before:max-w-32"
          data-tip={t('boardConfig.cacheTip')}
        >
          <CircleQuestionMark size={16} />
        </div>
      </div>
      <div className="mt-1 flex items-start w-full">
        <input
          type="checkbox"
          className="toggle toggle-success"
          checked={isObjectCaching}
          onChange={updateCacheState}
        />
      </div>
    </div>
  )
}

export default CacheConfig
