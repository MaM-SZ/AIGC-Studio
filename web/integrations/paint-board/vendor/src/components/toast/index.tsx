import { FC } from 'react'
import { useTranslation } from 'react-i18next'

interface IProps {
  type?: 'error' | 'success' | 'warning' | 'info'
  message: string
}

const Toast: FC<IProps> = ({ message, type = 'success' }) => {
  const { t } = useTranslation()

  return (
    <div className="toast toast-top toast-center">
      <div className={`alert alert-${type}`}>
        <div>
          <span className="whitespace-nowrap">{t(message)}</span>
        </div>
      </div>
    </div>
  )
}

export default Toast
