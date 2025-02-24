import { useState, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS, type SupportedLanguage } from '../constants';

export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');

  const translate = useCallback((key: keyof typeof UI_TRANSLATIONS['en']) => {
    return UI_TRANSLATIONS[currentLanguage][key] || UI_TRANSLATIONS['en'][key];
  }, [currentLanguage]);

  return {
    currentLanguage,
    setCurrentLanguage,
    translate,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
}