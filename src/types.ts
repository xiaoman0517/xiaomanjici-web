export interface Word {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleTranslation: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Voice {
  Id: string;
  Name: string;
  Gender?: string;
  LanguageCode: string;
  LanguageName?: string;
  SupportedEngines?: string[];
}

export type AutoPlayMode = 'off' | 'word' | 'wordExample';

export interface Settings {
  languageCode: string;
  voiceId: string;
  interval: number;
  autoPlayMode: AutoPlayMode;
  randomMode: boolean;
}

export type QuizPhase = 'testing' | 'retest' | 'review' | 'complete';

export interface RepeatItem {
  word: Word;
  wait: number;
}

export interface QuizState {
  phase: QuizPhase;
  list: Word[];
  repeats: RepeatItem[];
  current: Word | null;
  currentIsRepeat: boolean;
  unknown: Word[];
  unknownCount: number;
  total: number;
  remain: number;
  retestTotal: number;
  reviewed: number;
  reviewIndex: number;
}

export interface WordListEntry {
  fileName: string;
  category: string;
  fileSize?: number;
  size?: number;
  s3Key: string;
  key?: string;
  downloadUrl: string;
  lastModified?: string;
}
