import type { Language, Voice } from '../types';

export const LANGUAGE_NAMES: Record<string, string> = {
  arb: '阿拉伯语',
  'ar-AE': '阿拉伯语（海湾）',
  'ca-ES': '加泰罗尼亚语',
  'yue-CN': '中文（粤语）',
  'cmn-CN': '中文（普通话）',
  'cs-CZ': '捷克语',
  'da-DK': '丹麦语',
  'nl-BE': '荷兰语（比利时）',
  'nl-NL': '荷兰语',
  'en-AU': '英语（澳大利亚）',
  'en-GB': '英语（英国）',
  'en-IN': '英语（印度）',
  'en-NZ': '英语（新西兰）',
  'en-SG': '英语（新加坡）',
  'en-ZA': '英语（南非）',
  'en-US': '英语（美国）',
  'en-GB-WLS': '英语（威尔士）',
  'fi-FI': '芬兰语',
  'fr-FR': '法语',
  'fr-BE': '法语（比利时）',
  'fr-CA': '法语（加拿大）',
  'hi-IN': '印地语',
  'de-DE': '德语',
  'de-AT': '德语（奥地利）',
  'de-CH': '德语（瑞士）',
  'is-IS': '冰岛语',
  'it-IT': '意大利语',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'nb-NO': '挪威语',
  'pl-PL': '波兰语',
  'pt-BR': '葡萄牙语（巴西）',
  'pt-PT': '葡萄牙语（葡萄牙）',
  'ro-RO': '罗马尼亚语',
  'ru-RU': '俄语',
  'es-ES': '西班牙语（西班牙）',
  'es-MX': '西班牙语（墨西哥）',
  'es-US': '西班牙语（美国）',
  'sv-SE': '瑞典语',
  'tr-TR': '土耳其语',
  'cy-GB': '威尔士语'
};

export const fallbackVoices: Voice[] = [
  { Id: 'Joanna', Name: 'Joanna', Gender: 'Female', LanguageCode: 'en-US', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Matthew', Name: 'Matthew', Gender: 'Male', LanguageCode: 'en-US', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Ivy', Name: 'Ivy', Gender: 'Female', LanguageCode: 'en-US', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Salli', Name: 'Salli', Gender: 'Female', LanguageCode: 'en-US', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Celine', Name: 'Celine', Gender: 'Female', LanguageCode: 'fr-FR', SupportedEngines: ['standard'] },
  { Id: 'Mathieu', Name: 'Mathieu', Gender: 'Male', LanguageCode: 'fr-FR', SupportedEngines: ['standard'] },
  { Id: 'Lea', Name: 'Lea', Gender: 'Female', LanguageCode: 'fr-FR', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Mizuki', Name: 'Mizuki', Gender: 'Female', LanguageCode: 'ja-JP', SupportedEngines: ['standard'] },
  { Id: 'Takumi', Name: 'Takumi', Gender: 'Male', LanguageCode: 'ja-JP', SupportedEngines: ['standard'] },
  { Id: 'Lucia', Name: 'Lucia', Gender: 'Female', LanguageCode: 'es-ES', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Enrique', Name: 'Enrique', Gender: 'Male', LanguageCode: 'es-ES', SupportedEngines: ['standard'] },
  { Id: 'Tatyana', Name: 'Tatyana', Gender: 'Female', LanguageCode: 'ru-RU', SupportedEngines: ['standard'] },
  { Id: 'Maxim', Name: 'Maxim', Gender: 'Male', LanguageCode: 'ru-RU', SupportedEngines: ['standard'] },
  { Id: 'Marlene', Name: 'Marlene', Gender: 'Female', LanguageCode: 'de-DE', SupportedEngines: ['standard'] },
  { Id: 'Hans', Name: 'Hans', Gender: 'Male', LanguageCode: 'de-DE', SupportedEngines: ['standard'] },
  { Id: 'Carla', Name: 'Carla', Gender: 'Female', LanguageCode: 'it-IT', SupportedEngines: ['standard'] },
  { Id: 'Giorgio', Name: 'Giorgio', Gender: 'Male', LanguageCode: 'it-IT', SupportedEngines: ['standard'] },
  { Id: 'Seoyeon', Name: 'Seoyeon', Gender: 'Female', LanguageCode: 'ko-KR', SupportedEngines: ['neural', 'standard'] },
  { Id: 'Zeina', Name: 'Zeina', Gender: 'Female', LanguageCode: 'arb', SupportedEngines: ['standard'] },
  { Id: 'Zhiyu', Name: 'Zhiyu', Gender: 'Female', LanguageCode: 'cmn-CN', SupportedEngines: ['standard'] }
];

export function buildLanguages(voices: Voice[]): Language[] {
  const map = new Map<string, Language>();
  voices.forEach((voice) => {
    if (!voice.LanguageCode || map.has(voice.LanguageCode)) return;
    map.set(voice.LanguageCode, {
      code: voice.LanguageCode,
      name: LANGUAGE_NAMES[voice.LanguageCode] || voice.LanguageName || voice.LanguageCode
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
