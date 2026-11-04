import type { Language, Voice, Word } from '../types';

export const DISCOVER_CATEGORIES = [
  { label: '英语', category: 'English', flag: '🇺🇸' },
  { label: '法语', category: 'French', flag: '🇫🇷' },
  { label: '日语', category: 'Japanese', flag: '🇯🇵' },
  { label: '西班牙语', category: 'Spanish', flag: '🇪🇸' },
  { label: '俄语', category: 'Russian', flag: '🇷🇺' },
  { label: '德语', category: 'German', flag: '🇩🇪' },
  { label: '意大利语', category: 'Italian', flag: '🇮🇹' },
  { label: '韩语', category: 'Korean', flag: '🇰🇷' },
  { label: '阿拉伯语', category: 'Arabic', flag: '🇸🇦' },
  { label: '其他', category: 'Other', flag: '🌍' }
] as const;

const CATEGORY_TO_LANGUAGE: Record<string, string> = {
  English: 'en-US',
  French: 'fr-FR',
  Japanese: 'ja-JP',
  Spanish: 'es-ES',
  Russian: 'ru-RU',
  German: 'de-DE',
  Italian: 'it-IT',
  Korean: 'ko-KR',
  Arabic: 'arb',
  Other: ''
};

const PREFERRED_VOICES: Record<string, string[]> = {
  'en-US': ['Joanna', 'Matthew', 'Ivy', 'Salli', 'Kendra', 'Kimberly'],
  'en-GB': ['Amy', 'Emma', 'Brian', 'Geraint'],
  'fr-FR': ['Celine', 'Mathieu', 'Lea'],
  'ja-JP': ['Mizuki', 'Takumi'],
  'es-ES': ['Lucia', 'Enrique', 'Conchita'],
  'es-MX': ['Mia'],
  'ru-RU': ['Tatyana', 'Maxim'],
  'de-DE': ['Marlene', 'Hans', 'Vicki'],
  'it-IT': ['Carla', 'Giorgio', 'Bianca'],
  'ko-KR': ['Seoyeon'],
  arb: ['Zeina'],
  'cmn-CN': ['Zhiyu'],
  'pt-BR': ['Camila', 'Vitoria', 'Ricardo'],
  'pt-PT': ['Ines', 'Cristiano'],
  'nl-NL': ['Lotte', 'Ruben'],
  'pl-PL': ['Ewa', 'Maja', 'Jacek', 'Jan'],
  'sv-SE': ['Astrid'],
  'tr-TR': ['Filiz'],
  'hi-IN': ['Aditi', 'Raveena'],
  'ca-ES': ['Arlet'],
  'cs-CZ': ['Vlasta'],
  'da-DK': ['Naja', 'Mads'],
  'fi-FI': ['Suvi'],
  'nb-NO': ['Liv'],
  'ro-RO': ['Carmen'],
  'cy-GB': ['Gwyneth']
};

export function categoryFromLanguage(code: string) {
  if (!code) return 'Other';
  const lower = code.toLowerCase();
  if (lower.startsWith('en')) return 'English';
  if (lower.startsWith('fr')) return 'French';
  if (lower.startsWith('ja')) return 'Japanese';
  if (lower.startsWith('es')) return 'Spanish';
  if (lower.startsWith('ru')) return 'Russian';
  if (lower.startsWith('de')) return 'German';
  if (lower.startsWith('it')) return 'Italian';
  if (lower.startsWith('ko')) return 'Korean';
  if (lower.startsWith('ar')) return 'Arabic';
  return 'Other';
}

export function languageFromCategory(category: string) {
  return CATEGORY_TO_LANGUAGE[category] || '';
}

export function resolveLanguageCode(code: string, languages: Language[]) {
  if (!languages.length) return code || 'en-US';
  if (languages.some((language) => language.code === code)) return code;
  const prefix = (code || '').toLowerCase().split('-')[0];
  const matched = languages.find((language) => language.code.toLowerCase().startsWith(prefix));
  if (matched) return matched.code;
  return languages.find((language) => language.code === 'en-US')?.code || languages[0].code;
}

export function chooseDefaultVoice(voices: Voice[], languageCode: string, preferredVoiceId?: string) {
  if (voices.length === 0) return '';
  if (preferredVoiceId && voices.some((voice) => voice.Id === preferredVoiceId)) {
    return preferredVoiceId;
  }

  const preferredNames = PREFERRED_VOICES[languageCode] || [];
  for (const name of preferredNames) {
    const matched = voices.find(
      (voice) => voice.Id.toLowerCase() === name.toLowerCase() || voice.Name.toLowerCase() === name.toLowerCase()
    );
    if (matched) return matched.Id;
  }

  const neural = voices.find((voice) => voice.SupportedEngines?.includes('neural'));
  return (neural || voices[0]).Id;
}

export function languageLabel(code: string, languages: Language[]) {
  return languages.find((language) => language.code === code)?.name || code;
}

/* ------------------------------------------------------------------ */
/* 语言检测：脚本特征 + 变音符号 + 停用词 + 文件名                     */
/* ------------------------------------------------------------------ */

export interface LanguageDetection {
  code: string;
  confidence: number;
  reason: string;
}

const LANGUAGE_NAME_HINTS: Array<{ code: string; words: string[] }> = [
  { code: 'en-US', words: ['english', '英语', '英文', 'en-us', 'toefl', 'ielts', 'cet'] },
  { code: 'fr-FR', words: ['french', 'français', 'francais', '法语', '法文'] },
  { code: 'ja-JP', words: ['japanese', '日本語', '日语', '日文'] },
  { code: 'es-ES', words: ['spanish', 'español', 'espanol', '西班牙语', '西语'] },
  { code: 'ru-RU', words: ['russian', 'русский', '俄语', '俄文'] },
  { code: 'de-DE', words: ['german', 'deutsch', '德语', '德文'] },
  { code: 'it-IT', words: ['italian', 'italiano', '意大利语', '意语'] },
  { code: 'ko-KR', words: ['korean', '한국어', '韩语', '韩文'] },
  { code: 'arb', words: ['arabic', 'العربية', '阿拉伯语', '阿语'] },
  { code: 'cmn-CN', words: ['chinese', '中文', '汉语', '普通话'] },
  { code: 'pt-BR', words: ['portuguese', 'português', '葡萄牙语', '葡语'] },
  { code: 'nl-NL', words: ['dutch', 'nederlands', '荷兰语'] }
];

const STOPWORDS: Record<string, string[]> = {
  'en-US': [
    'the', 'and', 'of', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as',
    'with', 'his', 'they', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'but', 'not',
    'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'each', 'which', 'she',
    'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these',
    'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more'
  ],
  'fr-FR': [
    'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en', 'que', 'qui', 'dans', 'pour',
    'pas', 'au', 'aux', 'avec', 'sur', 'se', 'ce', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'être',
    'avoir', 'faire', 'plus', 'mais', 'ou', 'où', 'donc', 'car', 'je', 'tu', 'mon', 'ma', 'mes', 'son',
    'sa', 'ses', 'cette', 'ces', 'tout', 'tous', 'comme', 'très', 'bien'
  ],
  'es-ES': [
    'el', 'la', 'los', 'las', 'de', 'del', 'un', 'una', 'y', 'es', 'en', 'que', 'por', 'para', 'con',
    'no', 'se', 'su', 'al', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque',
    'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien',
    'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso'
  ],
  'de-DE': [
    'der', 'die', 'das', 'und', 'in', 'den', 'von', 'zu', 'mit', 'sich', 'des', 'auf', 'für', 'ist',
    'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat',
    'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über',
    'einen', 'so', 'zum', 'war', 'haben', 'nur', 'oder', 'aber', 'vor', 'zur', 'bis', 'mehr', 'durch'
  ],
  'it-IT': [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'del', 'della', 'dei', 'degli', 'delle', 'un', 'uno',
    'una', 'e', 'ed', 'è', 'in', 'che', 'per', 'con', 'non', 'si', 'su', 'al', 'alla', 'ai', 'alle',
    'da', 'dal', 'dalla', 'come', 'più', 'ma', 'anche', 'questo', 'questa', 'ha', 'hanno', 'essere',
    'stato', 'sono', 'sua', 'suo', 'tra', 'fra', 'quando', 'molto', 'tutto', 'tutti', 'fare', 'può'
  ],
  'pt-BR': [
    'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'uns', 'umas', 'e', 'é', 'em',
    'no', 'na', 'nos', 'nas', 'que', 'para', 'com', 'não', 'se', 'por', 'mais', 'mas', 'como',
    'também', 'seu', 'sua', 'seus', 'suas', 'ao', 'aos', 'à', 'às', 'foi', 'ser', 'são', 'está', 'tem',
    'têm', 'há', 'pelo', 'pela', 'entre', 'quando', 'muito', 'já', 'isso', 'isto', 'aqui', 'onde'
  ],
  'nl-NL': [
    'de', 'het', 'een', 'en', 'van', 'in', 'is', 'dat', 'op', 'te', 'met', 'voor', 'niet', 'zijn',
    'er', 'aan', 'om', 'ook', 'als', 'dan', 'maar', 'door', 'over', 'bij', 'uit', 'nog', 'zal',
    'wordt', 'kan', 'hij', 'zij', 'wij', 'jullie', 'ik', 'je', 'u', 'dit', 'deze', 'die', 'wat'
  ]
};

const SUFFIX_HINTS: Record<string, string[]> = {
  'en-US': ['tion', 'ness', 'ment', 'able', 'ible', 'ing', 'ed', 'ly', 'ous', 'ive'],
  'fr-FR': ['tion', 'ment', 'eux', 'aux', 'ique', 'ette', 'ance', 'ence', 'oir', 'eur'],
  'es-ES': ['ción', 'mente', 'ado', 'ido', 'ando', 'iendo', 'dad', 'oso', 'osa', 'amiento'],
  'de-DE': ['ung', 'heit', 'keit', 'lich', 'schaft', 'isch', 'chen', 'lein'],
  'it-IT': ['zione', 'mente', 'ato', 'ito', 'ando', 'endo', 'are', 'ere', 'ire', 'ità'],
  'pt-BR': ['ção', 'mente', 'ado', 'ido', 'ando', 'endo', 'dade', 'oso', 'osa'],
  'nl-NL': ['heid', 'ing', 'lijk', 'schap', 'eren', 'eren']
};

function tokenize(words: Word[]) {
  const tokens: string[] = [];
  words.forEach((word) => {
    const matches = word.word.toLowerCase().match(/\p{L}+/gu);
    if (matches) tokens.push(...matches);
  });
  return tokens;
}

function countMatches(tokens: string[], list: string[]) {
  const set = new Set(list);
  return tokens.reduce((count, token) => count + (set.has(token) ? 1 : 0), 0);
}

function scriptDetection(text: string): LanguageDetection | null {
  if (/[\u3040-\u30ff]/.test(text)) {
    return { code: 'ja-JP', confidence: 0.98, reason: '检测到日文假名' };
  }
  if (/[\uac00-\ud7af]/.test(text)) {
    return { code: 'ko-KR', confidence: 0.98, reason: '检测到韩文谚文' };
  }
  if (/[\u0600-\u06ff]/.test(text)) {
    return { code: 'arb', confidence: 0.96, reason: '检测到阿拉伯文字' };
  }
  if (/[\u0400-\u04ff]/.test(text)) {
    if (/[іїєґ]/i.test(text)) {
      return { code: 'uk-UA', confidence: 0.9, reason: '检测到乌克兰语字符' };
    }
    return { code: 'ru-RU', confidence: 0.92, reason: '检测到西里尔文字' };
  }
  if (/[\u0370-\u03ff]/.test(text)) {
    return { code: 'el-GR', confidence: 0.95, reason: '检测到希腊文字' };
  }
  if (/[\u0e00-\u0e7f]/.test(text)) {
    return { code: 'th-TH', confidence: 0.95, reason: '检测到泰文字' };
  }
  if (/[\u0900-\u097f]/.test(text)) {
    return { code: 'hi-IN', confidence: 0.94, reason: '检测到天城文字' };
  }
  if (/[\u4e00-\u9fff]/.test(text)) {
    return { code: 'cmn-CN', confidence: 0.9, reason: '检测到中文字符' };
  }
  return null;
}

function diacriticScores(text: string) {
  const scores: Record<string, number> = {};
  const add = (code: string, value: number) => {
    scores[code] = (scores[code] || 0) + value;
  };

  add('es-ES', (text.match(/[ñ¿¡]/g) || []).length * 4);
  add('es-ES', (text.match(/[áéíóú]/g) || []).length * 0.6);
  add('fr-FR', (text.match(/[œç]/g) || []).length * 3);
  add('fr-FR', (text.match(/[àâæéèêëîïôùûüÿ]/g) || []).length * 0.8);
  add('de-DE', (text.match(/[äöüß]/g) || []).length * 2);
  add('pt-BR', (text.match(/[ãõ]/g) || []).length * 4);
  add('pt-BR', (text.match(/[áâêôç]/g) || []).length * 0.6);
  add('it-IT', (text.match(/[ìòù]/g) || []).length * 2);
  add('pl-PL', (text.match(/[łśźżćńąę]/g) || []).length * 3);
  add('cs-CZ', (text.match(/[řěů]/g) || []).length * 4);
  add('ro-RO', (text.match(/[șț]/g) || []).length * 4);
  add('tr-TR', (text.match(/[ğışİ]/g) || []).length * 4);
  add('sv-SE', (text.match(/[åäö]/g) || []).length * 0.8);
  add('da-DK', (text.match(/[æøå]/g) || []).length * 1.5);
  add('nb-NO', (text.match(/[æøå]/g) || []).length * 1.5);

  return scores;
}

function suffixScores(tokens: string[]) {
  const scores: Record<string, number> = {};
  Object.entries(SUFFIX_HINTS).forEach(([code, suffixes]) => {
    let hits = 0;
    tokens.forEach((token) => {
      if (suffixes.some((suffix) => token.endsWith(suffix))) hits += 1;
    });
    scores[code] = tokens.length ? (hits / tokens.length) * 2.2 : 0;
  });
  return scores;
}

/**
 * 不需要 AI 的语言检测。
 * 置信度低时 UI 会提示用户手动确认，而不是静默猜测。
 */
export function detectLanguage(words: Word[], fileName = ''): LanguageDetection {
  const text = words
    .slice(0, 200)
    .map((word) => word.word)
    .join(' ');
  const tokens = tokenize(words.slice(0, 200));

  const nameHint = LANGUAGE_NAME_HINTS.find(({ words: hints }) =>
    hints.some((hint) => fileName.toLowerCase().includes(hint.toLowerCase()))
  );
  if (nameHint) {
    return { code: nameHint.code, confidence: 0.98, reason: `文件名包含「${fileName}」` };
  }

  const script = scriptDetection(text);
  if (script) return script;

  const diacritics = diacriticScores(text);
  const stopwordScores: Record<string, number> = {};
  Object.entries(STOPWORDS).forEach(([code, list]) => {
    stopwordScores[code] = tokens.length ? (countMatches(tokens, list) / tokens.length) * 8 : 0;
  });
  const suffixes = suffixScores(tokens);

  const codes = new Set([
    ...Object.keys(diacritics),
    ...Object.keys(stopwordScores),
    ...Object.keys(suffixes),
    'en-US',
    'fr-FR',
    'es-ES',
    'de-DE',
    'it-IT',
    'pt-BR',
    'nl-NL'
  ]);

  let bestCode = '';
  let bestScore = 0;
  codes.forEach((code) => {
    const score = (diacritics[code] || 0) + (stopwordScores[code] || 0) + (suffixes[code] || 0);
    if (score > bestScore) {
      bestCode = code;
      bestScore = score;
    }
  });

  if (!bestCode || bestScore < 0.35) {
    return {
      code: 'en-US',
      confidence: 0.3,
      reason: '未能确定语言，先按英语处理，可手动修改'
    };
  }

  const confidence = Math.min(0.95, 0.45 + bestScore / 18);
  return {
    code: bestCode,
    confidence,
    reason: `根据字母特征与常用词判断（${tokens.length} 个词）`
  };
}
