// language mapping table
const languageMap: Record<string, string> = {
  en: 'en',
  'en-US': 'en',
  'en-us': 'en',
  zh: 'zh',
  'zh-CN': 'zh',
  'zh-cn': 'zh',
  'zh-TW': 'zh-TW',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  'ja-JP': 'ja',
  'ja-jp': 'ja',
  ko: 'ko',
  'ko-KR': 'ko',
  'ko-kr': 'ko'
}

// get initial language, if not supported, use english
export const getInitLanguage = (): string => {
  const browserLang = navigator.language

  // directly match
  if (languageMap[browserLang]) {
    return languageMap[browserLang]
  }

  // try to match language prefix (like zh-Hans -> zh)
  const langPrefix = browserLang.split('-')[0]
  if (languageMap[langPrefix]) {
    return languageMap[langPrefix]
  }

  // default use english
  return 'en'
}
