import type { QuizState, Word } from '../types';
import { shuffle } from './utils';

export const initialQuiz: QuizState = {
  phase: 'testing',
  list: [],
  repeats: [],
  current: null,
  currentIsRepeat: false,
  unknown: [],
  unknownCount: 0,
  total: 0,
  remain: 0,
  retestTotal: 0,
  reviewed: 0,
  reviewIndex: 0
};

export function startQuiz(words: Word[]): QuizState {
  if (words.length === 0) return { ...initialQuiz };
  const state: QuizState = {
    ...initialQuiz,
    phase: 'testing',
    list: shuffle(words),
    total: words.length,
    remain: words.length
  };
  return nextWord(state);
}

/**
 * 出题逻辑与小程序一致：
 * 1. 优先从 repeats 中取出 wait <= 0 的错词；
 * 2. 否则从 quizList 随机取词，并让其他错词的 wait - 1；
 * 3. 如果没有词了：有错词进入 review，否则 complete。
 */
export function nextWord(state: QuizState): QuizState {
  if (state.phase === 'complete' || state.phase === 'review') return state;

  const list = [...state.list];
  const repeats = state.repeats.map((item) => ({ ...item }));
  let current: Word | null = null;
  let currentIsRepeat = false;

  const readyIndexes = repeats
    .map((item, index) => (item.wait <= 0 ? index : -1))
    .filter((index) => index >= 0);

  if (readyIndexes.length > 0 || (list.length === 0 && repeats.length > 0)) {
    const index =
      readyIndexes.length > 0
        ? readyIndexes[Math.floor(Math.random() * readyIndexes.length)]
        : repeats.reduce((best, item, i) => (item.wait < repeats[best].wait ? i : best), 0);
    const [picked] = repeats.splice(index, 1);
    current = picked?.word ?? null;
    currentIsRepeat = Boolean(picked);
  } else if (list.length > 0) {
    const index = Math.floor(Math.random() * list.length);
    current = list.splice(index, 1)[0];
    repeats.forEach((item) => {
      item.wait = Math.max(0, item.wait - 1);
    });
  }

  if (!current) {
    if (state.unknown.length > 0) {
      return {
        ...state,
        phase: 'review',
        list,
        repeats,
        current: state.unknown[0],
        currentIsRepeat: false,
        reviewIndex: 0,
        remain: 0,
        unknownCount: state.unknown.length
      };
    }
    return {
      ...state,
      phase: 'complete',
      list,
      repeats,
      current: null,
      currentIsRepeat: false,
      remain: 0,
      unknownCount: 0
    };
  }

  const remain =
    state.phase === 'retest' ? Math.max(0, state.total - state.reviewed) : list.length;

  return {
    ...state,
    list,
    repeats,
    current,
    currentIsRepeat,
    remain,
    unknownCount: state.unknown.length
  };
}

export function answerKnow(state: QuizState): QuizState {
  if (!state.current) return state;

  let unknown = state.unknown;
  let reviewed = state.reviewed;

  if (state.phase === 'retest' && !state.currentIsRepeat) {
    reviewed += 1;
  }

  // 重测阶段再次遇到复现词并认识时，从错词回顾列表里移除
  if (state.phase === 'retest' && state.currentIsRepeat) {
    unknown = unknown.filter((item) => item.id !== state.current?.id);
  }

  return nextWord({
    ...state,
    unknown,
    unknownCount: unknown.length,
    reviewed
  });
}

export function answerUnknown(state: QuizState): QuizState {
  if (!state.current) return state;

  const current = state.current;
  const repeats = [...state.repeats, { word: current, wait: 2 }];
  const unknown = state.unknown.some((item) => item.id === current.id)
    ? state.unknown
    : [...state.unknown, current];

  let reviewed = state.reviewed;
  if (state.phase === 'retest' && !state.currentIsRepeat) {
    reviewed += 1;
  }

  return nextWord({
    ...state,
    repeats,
    unknown,
    unknownCount: unknown.length,
    reviewed
  });
}

export function startRetest(state: QuizState): QuizState {
  const unknown = [...state.unknown];
  if (unknown.length === 0) {
    return { ...state, phase: 'complete', current: null, remain: 0 };
  }

  const retest: QuizState = {
    ...initialQuiz,
    phase: 'retest',
    list: shuffle(unknown),
    total: unknown.length,
    remain: unknown.length,
    retestTotal: unknown.length,
    reviewed: 0,
    unknown: [],
    unknownCount: 0
  };
  return nextWord(retest);
}

export function reviewAt(state: QuizState, index: number): QuizState {
  const safeIndex = Math.max(0, Math.min(index, state.unknown.length - 1));
  return {
    ...state,
    reviewIndex: safeIndex,
    current: state.unknown[safeIndex] ?? null
  };
}

export function finishReview(state: QuizState): QuizState {
  return {
    ...state,
    phase: 'complete',
    current: null,
    remain: 0,
    reviewIndex: 0
  };
}

export function progressPercent(state: QuizState) {
  if (!state.total) return 0;
  const answered = Math.max(0, state.total - state.remain);
  return Math.min(100, Math.round((answered / state.total) * 100));
}

export function answeredCount(state: QuizState) {
  return Math.max(0, state.total - state.remain);
}
