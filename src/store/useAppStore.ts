import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildLanguages } from '../data/fallback';
import { initialQuiz } from '../lib/quizEngine';
import type { Language, QuizState, Settings, Voice, Word } from '../types';

interface AppStore {
  words: Word[];
  fileName: string;
  currentIndex: number;
  masteredCount: number;

  settings: Settings;
  languages: Language[];
  allVoices: Voice[];
  voices: Voice[];
  voicesLoaded: boolean;

  history: Word[];
  quiz: QuizState;

  setWords: (words: Word[], fileName: string) => void;
  addWords: (words: Word[], fileName?: string) => number;
  removeWordAt: (index: number, mastered?: boolean) => void;
  setCurrentIndex: (index: number) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  applyCatalog: (voices: Voice[]) => void;
  setLanguage: (code: string) => void;
  setVoice: (id: string) => void;

  addHistory: (words: Word[]) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;

  setQuiz: (quiz: QuizState) => void;
  resetQuiz: () => void;
  resetAll: () => void;
}

const defaultSettings: Settings = {
  languageCode: 'en-US',
  voiceId: 'Joanna',
  interval: 3,
  autoPlayMode: 'off',
  randomMode: false
};

function dedupeWords(words: Word[]) {
  const seen = new Set<string>();
  const result: Word[] = [];
  words.forEach((word) => {
    const key = word.word.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(word);
  });
  return result;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      words: [],
      fileName: '',
      currentIndex: 0,
      masteredCount: 0,

      settings: defaultSettings,
      languages: [],
      allVoices: [],
      voices: [],
      voicesLoaded: false,

      history: [],
      quiz: { ...initialQuiz },

      setWords: (words, fileName) =>
        set({
          words: dedupeWords(words),
          fileName,
          currentIndex: 0,
          masteredCount: 0,
          quiz: { ...initialQuiz }
        }),

      addWords: (words, fileName) => {
        const existing = get().words;
        const merged = dedupeWords([...existing, ...words]);
        const added = merged.length - existing.length;
        set({
          words: merged,
          fileName: fileName || get().fileName || 'AI 查询结果',
          quiz: { ...initialQuiz }
        });
        return added;
      },

      removeWordAt: (index, mastered = true) =>
        set((state) => {
          if (index < 0 || index >= state.words.length) return state;
          const words = [...state.words];
          words.splice(index, 1);
          let currentIndex = state.currentIndex;
          if (index < currentIndex) currentIndex -= 1;
          if (index === currentIndex) currentIndex = Math.min(currentIndex, Math.max(0, words.length - 1));
          return {
            words,
            currentIndex: words.length ? Math.max(0, Math.min(currentIndex, words.length - 1)) : 0,
            masteredCount: state.masteredCount + (mastered ? 1 : 0),
            fileName: words.length ? state.fileName : '',
            quiz: { ...initialQuiz }
          };
        }),

      setCurrentIndex: (index) =>
        set((state) => ({
          currentIndex: Math.max(0, Math.min(index, Math.max(0, state.words.length - 1)))
        })),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      applyCatalog: (rawVoices) => {
        // 过滤掉只支持 generative 等当前合成接口未覆盖的音色
        const allVoices = rawVoices.filter((voice) => {
          const engines = voice.SupportedEngines || [];
          return engines.length === 0 || engines.includes('neural') || engines.includes('standard');
        });
        const languages = buildLanguages(allVoices);
        const state = get();
        const languageCode = languages.some((item) => item.code === state.settings.languageCode)
          ? state.settings.languageCode
          : languages.find((item) => item.code === 'en-US')?.code || languages[0]?.code || 'en-US';
        const voices = allVoices.filter((voice) => voice.LanguageCode === languageCode);
        const voiceId = voices.some((voice) => voice.Id === state.settings.voiceId)
          ? state.settings.voiceId
          : voices[0]?.Id || '';
        set({
          allVoices,
          languages,
          voices,
          voicesLoaded: true,
          settings: { ...state.settings, languageCode, voiceId }
        });
      },

      setLanguage: (code) => {
        const state = get();
        const voices = state.allVoices.filter((voice) => voice.LanguageCode === code);
        const voiceId = voices.some((voice) => voice.Id === state.settings.voiceId)
          ? state.settings.voiceId
          : voices[0]?.Id || '';
        set({
          voices,
          settings: { ...state.settings, languageCode: code, voiceId }
        });
      },

      setVoice: (id) => set((state) => ({ settings: { ...state.settings, voiceId: id } })),

      addHistory: (words) =>
        set((state) => {
          const incoming = dedupeWords(words);
          const existing = state.history.filter(
            (item) => !incoming.some((word) => word.word.toLowerCase() === item.word.toLowerCase())
          );
          return { history: [...incoming, ...existing].slice(0, 100) };
        }),

      removeHistory: (id) =>
        set((state) => ({ history: state.history.filter((item) => item.id !== id) })),

      clearHistory: () => set({ history: [] }),

      setQuiz: (quiz) => set({ quiz }),

      resetQuiz: () => set({ quiz: { ...initialQuiz } }),

      resetAll: () =>
        set({
          words: [],
          fileName: '',
          currentIndex: 0,
          masteredCount: 0,
          history: [],
          quiz: { ...initialQuiz },
          settings: defaultSettings
        })
    }),
    {
      name: 'xiaomanjici-web-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        words: state.words,
        fileName: state.fileName,
        currentIndex: state.currentIndex,
        masteredCount: state.masteredCount,
        settings: state.settings,
        languages: state.languages,
        allVoices: state.allVoices,
        voices: state.voices,
        voicesLoaded: state.voicesLoaded,
        history: state.history,
        quiz: state.quiz
      })
    }
  )
);
