import { useTranslation } from 'react-i18next'

const Features = () => {
  const { t } = useTranslation()

  return (
    <div className="pb-10">
      <div className="text-xl font-bold my-4">{t('features.drawingMode')}</div>
      <div className="text-lg font-bold my-4 pl-3">
        {t('features.freeDrawing')}
      </div>
      <ul className="list-disc pl-10">
        <li>{t('features.freeDrawingDesc1')}</li>
        <li>{t('features.freeDrawingDesc2')}</li>
        <li>{t('features.freeDrawingDesc3')}</li>
        <li>{t('features.freeDrawingDesc4')}</li>
        <li>{t('features.freeDrawingDesc5')}</li>
      </ul>
      <div className="text-lg font-bold my-4 pl-3">
        {t('features.shapeDrawing')}
      </div>
      <ul className="list-disc pl-10">
        <li>{t('features.shapeDrawingDesc1')}</li>
        <li>{t('features.shapeDrawingDesc2')}</li>
      </ul>
      <div className="text-xl font-bold my-4">{t('features.eraserMode')}</div>
      <ul className="list-disc pl-10">
        <li>{t('features.eraserModeDesc1')}</li>
        <li>{t('features.eraserModeDesc2')}</li>
      </ul>
      <div className="text-xl font-bold my-4">{t('features.selectMode')}</div>
      <ul className="list-disc pl-10">
        <li>{t('features.selectModeDesc1')}</li>
        <li>{t('features.selectModeDesc2')}</li>
        <li>{t('features.selectModeDesc3')}</li>
        <ul className="list-disc pl-10">
          <li>{t('features.selectModeDesc3_1')}</li>
          <li>{t('features.selectModeDesc3_2')}</li>
          <li>{t('features.selectModeDesc3_3')}</li>
        </ul>
        <li>{t('features.selectModeDesc4')}</li>
        <li>{t('features.selectModeDesc5')}</li>
      </ul>
      <div className="text-xl font-bold my-4">{t('features.boardMode')}</div>
      <ul className="list-disc pl-10">
        <li>{t('features.boardModeDesc1')}</li>
        <ul className="list-disc pl-10">
          <li>{t('features.boardModeDesc1_1')}</li>
          <li>{t('features.boardModeDesc1_2')}</li>
          <li>{t('features.boardModeDesc1_3')}</li>
        </ul>
        <li>{t('features.boardModeDesc2')}</li>
        <li>{t('features.boardModeDesc3')}</li>
        <li>{t('features.boardModeDesc4')}</li>
      </ul>
      <div className="text-xl font-bold my-4">{t('features.operationBar')}</div>
      <div className="text-lg font-bold my-4 pl-3">
        {t('features.bottomLeftButtons')}
      </div>
      <ul className="list-disc pl-10">
        <li>{t('features.bottomLeftDesc1')}</li>
        <li>{t('features.bottomLeftDesc2')}</li>
        <li>{t('features.bottomLeftDesc3')}</li>
      </ul>
      <div className="text-lg font-bold my-4 pl-3">
        {t('features.bottomOperationBar')}
      </div>
      <ul className="list-disc pl-10">
        <li>{t('features.bottomOperationDesc1')}</li>
        <ul className="list-disc pl-10">
          <li>{t('features.bottomOperationDesc1_1')}</li>
          <li>{t('features.bottomOperationDesc1_2')}</li>
        </ul>
      </ul>
      <div className="text-xl font-bold my-4">{t('features.fileList')}</div>
      <ul className="list-disc pl-10">
        <li>{t('features.fileListDesc')}</li>
      </ul>
      <div className="text-xl font-bold my-4">
        {t('features.internationalization')}
      </div>
      <ul className="list-disc pl-10">
        <li>{t('features.internationalizationDesc')}</li>
      </ul>
    </div>
  )
}

export default Features
