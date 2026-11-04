import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  Volume2,
  X
} from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { VoicePicker } from '../components/VoicePicker';
import { WordCard } from '../components/WordCard';
import { playText, stopAudio } from '../lib/audio';
import {
  answerKnow,
  answerUnknown,
  answeredCount,
  finishReview,
  progressPercent,
  reviewAt,
  startQuiz,
  startRetest
} from '../lib/quizEngine';
import { sleep } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import type { Word } from '../types';

async function exportWords(words: Word[], fileName: string) {
  const XLSX = await import('xlsx');
  const rows = words.map((word) => ({
    单词: word.word,
    音标: word.phonetic,
    释义: word.definition,
    例句: word.example,
    例句翻译: word.exampleTranslation
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '未掌握单词');
  XLSX.writeFile(workbook, fileName);
}

export default function QuizPage() {
  const words = useAppStore((state) => state.words);
  const quiz = useAppStore((state) => state.quiz);
  const settings = useAppStore((state) => state.settings);
  const setQuiz = useAppStore((state) => state.setQuiz);
  const toast = useToast();
  const navigate = useNavigate();

  const [showAnswer, setShowAnswer] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [reviewAuto, setReviewAuto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playingExample, setPlayingExample] = useState(false);

  const active = quiz.phase === 'testing' || quiz.phase === 'retest';
  const progress = progressPercent(quiz);
  const current = quiz.current;
  const reviewWord = quiz.unknown[quiz.reviewIndex];

  const stats = useMemo(
    () => ({
      answered: answeredCount(quiz),
      total: quiz.total,
      unknown: quiz.unknownCount,
      review: quiz.unknown.length
    }),
    [quiz]
  );

  const restart = () => {
    stopAudio();
    setReviewAuto(false);
    setShowAnswer(false);
    if (words.length === 0) {
      toast('词表为空，先去学习页导入单词吧', 'error');
      return;
    }
    setQuiz(startQuiz(words));
  };

  const playWord = async (text?: string) => {
    const value = text || current?.word;
    if (!value) return;
    stopAudio();
    setPlaying(true);
    await playText(value, settings.languageCode, settings.voiceId);
    setPlaying(false);
  };

  const playExample = async () => {
    if (!current?.example) return;
    stopAudio();
    setPlayingExample(true);
    await playText(current.example, settings.languageCode, settings.voiceId);
    setPlayingExample(false);
  };

  const know = () => {
    if (!current) return;
    stopAudio();
    setShowAnswer(false);
    setQuiz(answerKnow(quiz));
  };

  const unknown = () => {
    if (!current) return;
    stopAudio();
    setShowAnswer(false);
    setQuiz(answerUnknown(quiz));
  };

  const retest = () => {
    stopAudio();
    setReviewAuto(false);
    setShowAnswer(false);
    setQuiz(startRetest(quiz));
  };

  const complete = () => {
    stopAudio();
    setReviewAuto(false);
    setQuiz(finishReview(quiz));
  };

  useEffect(() => {
    setShowAnswer(false);
  }, [quiz.current?.id]);

  // 进入新词自动发音
  useEffect(() => {
    if (!autoSpeak || !quiz.current || !active) return;
    const timer = window.setTimeout(() => {
      void playText(quiz.current?.word || '', settings.languageCode, settings.voiceId);
    }, 320);
    return () => {
      window.clearTimeout(timer);
      stopAudio();
    };
  }, [active, autoSpeak, quiz.current?.id, settings.languageCode, settings.voiceId]);

  // 回顾模式自动轮播
  useEffect(() => {
    if (quiz.phase !== 'review' || !reviewAuto || quiz.unknown.length === 0) return;
    let cancelled = false;
    let index = quiz.reviewIndex;

    const run = async () => {
      while (!cancelled && index < quiz.unknown.length) {
        const word = quiz.unknown[index];
        if (!word) break;
        setQuiz(reviewAt(quiz, index));
        setPlaying(true);
        await playText(word.word, settings.languageCode, settings.voiceId);
        setPlaying(false);
        if (cancelled) break;
        await sleep(2000);
        if (cancelled) break;
        if (index >= quiz.unknown.length - 1) {
          setReviewAuto(false);
          break;
        }
        index += 1;
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopAudio();
      setPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewAuto, quiz.phase]);

  if (words.length === 0) {
    return (
      <div className="page-shell">
        <section className="glass-card mx-auto max-w-2xl p-8 text-center md:p-12">
          <Mascot size={150} className="mx-auto float-slow" />
          <h1 className="mt-4 font-display text-3xl font-black text-[#3f3a4f]">还没有可以测验的单词</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-[#91869d]">
            先去学习页导入一个词表，或让 AI 生成几个词。导入完成后就可以开始听写测验啦。
          </p>
          <Link to="/" className="btn-primary mt-6">
            <Sparkles size={17} />
            去学习页准备词表
          </Link>
        </section>
      </div>
    );
  }

  if (!active && quiz.phase !== 'review' && quiz.phase !== 'complete') {
    return (
      <div className="page-shell">
        <section className="glass-card mx-auto max-w-2xl p-8 text-center md:p-12">
          <Mascot size={150} className="mx-auto float-slow" />
          <h1 className="mt-4 font-display text-3xl font-black text-[#3f3a4f]">准备好了吗？</h1>
          <p className="mt-2 text-sm font-semibold text-[#91869d]">
            当前词表共 <span className="font-black text-sakura-deep">{words.length}</span> 个单词。
            听发音，判断自己是否认识，然后查看答案。
          </p>
          <button type="button" className="btn-primary mt-6" onClick={restart}>
            <Headphones size={18} />
            开始测验
          </button>
        </section>
      </div>
    );
  }

  if (!active && quiz.total === 0) {
    return (
      <div className="page-shell">
        <section className="glass-card mx-auto max-w-2xl p-8 text-center md:p-12">
          <Mascot size={150} className="mx-auto float-slow" />
          <h1 className="mt-4 font-display text-3xl font-black text-[#3f3a4f]">开始一轮新的测验</h1>
          <p className="mt-2 text-sm font-semibold text-[#91869d]">随机出题，错词会自动在稍后复现。</p>
          <button type="button" className="btn-primary mt-6" onClick={restart}>
            <Headphones size={18} />
            开始测验
          </button>
        </section>
      </div>
    );
  }

  if (quiz.phase === 'review') {
    return (
      <div className="page-shell">
        <section className="glass-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-kicker">REVIEW MODE</p>
              <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-black text-[#3f3a4f] md:text-3xl">
                <Sparkles size={22} className="text-grape" />
                再记一遍这些词
              </h1>
              <p className="mt-1 text-xs font-semibold text-[#91869d]">
                回顾进度：{quiz.reviewIndex + 1} / {quiz.unknown.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn-secondary px-3 py-2 text-xs ${reviewAuto ? 'ring-2 ring-sakura/40' : ''}`}
                onClick={() => {
                  if (reviewAuto) {
                    setReviewAuto(false);
                    stopAudio();
                  } else {
                    setReviewAuto(true);
                  }
                }}
              >
                {reviewAuto ? <Pause size={15} /> : <Play size={15} />}
                {reviewAuto ? '停止轮播' : '自动轮播'}
              </button>
              <button type="button" className="btn-primary px-4 py-2 text-xs" onClick={retest}>
                <RotateCcw size={15} />
                开始重测错词
              </button>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {reviewWord && (
              <div key={reviewWord.id} className="pop-in">
                <WordCard
                  word={reviewWord}
                  playingWord={playing}
                  playingExample={playingExample}
                  onPlayWord={() => void playWord(reviewWord.word)}
                  onPlayExample={async () => {
                    if (!reviewWord.example) return;
                    stopAudio();
                    setPlayingExample(true);
                    await playText(reviewWord.example, settings.languageCode, settings.voiceId);
                    setPlayingExample(false);
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={quiz.reviewIndex <= 0}
                onClick={() => {
                  setReviewAuto(false);
                  setQuiz(reviewAt(quiz, quiz.reviewIndex - 1));
                }}
              >
                <ChevronLeft size={17} />
                上一个
              </button>
              <span className="font-display text-xs font-black text-[#9b90a7]">
                {quiz.reviewIndex + 1} / {quiz.unknown.length}
              </span>
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={quiz.reviewIndex >= quiz.unknown.length - 1}
                onClick={() => {
                  setReviewAuto(false);
                  setQuiz(reviewAt(quiz, quiz.reviewIndex + 1));
                }}
              >
                下一个
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass-card p-5">
              <p className="section-kicker">REVIEW TIPS</p>
              <ul className="mt-3 space-y-2 text-xs font-semibold leading-relaxed text-[#7e7489]">
                <li>· 先听发音，回忆意思，再对照释义。</li>
                <li>· 自动轮播适合通勤或睡前快速过一遍。</li>
                <li>· 准备好后，直接重测这些错词。</li>
              </ul>
            </div>
            <button type="button" className="btn-secondary w-full" onClick={complete}>
              <Check size={16} />
              跳过重测，结束本轮
            </button>
          </aside>
        </div>
      </div>
    );
  }

  if (quiz.phase === 'complete') {
    const perfect = quiz.unknown.length === 0;
    return (
      <div className="page-shell">
        <section className="glass-card relative mx-auto max-w-3xl overflow-hidden p-8 text-center md:p-12">
          <div className="pointer-events-none absolute inset-0">
            {['🎉', '✨', '🌸', '⭐', '💖', '🎊'].map((item, index) => (
              <span
                key={item}
                className="absolute text-2xl opacity-80"
                style={{
                  left: `${10 + index * 15}%`,
                  top: `${8 + (index % 3) * 4}%`,
                  animation: `float-slow ${5 + index}s ease-in-out infinite`
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-lemon/80 to-sakura/60 shadow-soft">
              <Trophy size={54} className="text-white drop-shadow" />
            </div>
            <p className="section-kicker mt-5">COMPLETE</p>
            <h1 className="mt-1 font-display text-4xl font-black tracking-tight text-[#3f3a4f]">
              {perfect ? '全部掌握，太棒啦！' : '本轮测验完成'}
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-relaxed text-[#91869d]">
              {perfect
                ? '这一轮没有留下错词，给自己一个小小的奖励吧。'
                : `还有 ${quiz.unknown.length} 个词需要加强，可以回顾后再测一次。`}
            </p>

            <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3">
              {[
                { label: '本轮词数', value: quiz.total },
                { label: '需加强', value: quiz.unknown.length },
                { label: '完成度', value: `${progress}%` }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/80 bg-white/65 p-4">
                  <p className="font-display text-2xl font-black text-[#4b4459]">{item.value}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-[#a398ae]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {quiz.unknown.length > 0 && (
                <button type="button" className="btn-primary" onClick={retest}>
                  <RotateCcw size={16} />
                  重测错词
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={restart}>
                <Headphones size={16} />
                再来一轮
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void exportWords(quiz.unknown.length ? quiz.unknown : words, quiz.unknown.length ? '未掌握单词.xlsx' : '我的词表.xlsx')}
              >
                <Download size={16} />
                {quiz.unknown.length ? '导出错词' : '导出词表'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                返回学习
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">{quiz.phase === 'retest' ? 'RETEST' : 'QUIZ'}</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-black text-[#3f3a4f] md:text-3xl">
              <Headphones size={22} className="text-sakura-deep" />
              {quiz.phase === 'retest' ? '错词重测' : '听音辨词'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`btn-secondary px-3 py-2 text-xs ${autoSpeak ? 'ring-2 ring-sakura/35' : ''}`}
              onClick={() => {
                if (autoSpeak) stopAudio();
                setAutoSpeak((value) => !value);
              }}
            >
              {autoSpeak ? <Pause size={14} /> : <Play size={14} />}
              {autoSpeak ? '自动发音开' : '自动发音关'}
            </button>
            <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="语言与音色设置">
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="progress-track flex-1">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-display text-xs font-black text-[#9b90a7]">
            {stats.answered}/{stats.total}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#a398ae]">
          <span>进度 {progress}%</span>
          <span className="text-rose-400">需加强 {stats.unknown}</span>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {current && !showAnswer && (
            <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-8 text-center shadow-soft backdrop-blur-2xl md:p-12">
              <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-sakura/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-sky/20 blur-3xl" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => void playWord()}
                  className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-sakura to-[#f26f99] text-white shadow-[0_18px_40px_-18px_rgba(242,111,153,0.95)]"
                  aria-label="播放单词"
                >
                  {playing && <span className="pulse-ring absolute inset-0 rounded-full bg-sakura/50" />}
                  {playing ? <Loader2 size={36} className="animate-spin" /> : <Volume2 size={38} />}
                </button>
                <p className="mt-6 font-display text-lg font-black text-[#4b4459]">
                  {quiz.phase === 'retest' ? '再听一次，这次记住了吗？' : '你认识这个单词吗？'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#a398ae]">点击耳机播放发音 · 点击下方查看答案</p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setShowAnswer(true)}>
                    <Eye size={16} />
                    查看答案
                  </button>
                  {current.example && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void playExample()}
                      disabled={playingExample}
                    >
                      {playingExample ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                      播放例句
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {current && showAnswer && (
            <div className="space-y-4 pop-in">
              <WordCard
                word={current}
                playingWord={playing}
                playingExample={playingExample}
                onPlayWord={() => void playWord()}
                onPlayExample={() => void playExample()}
              />
              <button type="button" className="btn-secondary w-full" onClick={() => setShowAnswer(false)}>
                <Eye size={16} />
                收起答案，继续判断
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={unknown}
              className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-[0_16px_30px_-14px_rgba(244,63,94,0.7)] transition hover:scale-105 active:scale-95"
              aria-label="不认识"
            >
              <X size={34} strokeWidth={3} />
            </button>
            <div className="w-16 text-center">
              <p className="text-[10px] font-black tracking-[0.16em] text-[#b0a5ba]">ANSWER</p>
              <p className="mt-0.5 text-[11px] font-bold text-[#9b90a7]">认识 / 不认识</p>
            </div>
            <button
              type="button"
              onClick={know}
              className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_16px_30px_-14px_rgba(16,185,129,0.7)] transition hover:scale-105 active:scale-95"
              aria-label="认识"
            >
              <Check size={36} strokeWidth={3} />
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass-card p-5">
            <p className="section-kicker">THIS ROUND</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/65 p-3 text-center">
                <p className="font-display text-xl font-black text-[#4b4459]">{stats.answered}</p>
                <p className="text-[10px] font-bold text-[#a398ae]">已作答</p>
              </div>
              <div className="rounded-2xl bg-white/65 p-3 text-center">
                <p className="font-display text-xl font-black text-[#4b4459]">{stats.total}</p>
                <p className="text-[10px] font-bold text-[#a398ae]">总词数</p>
              </div>
              <div className="rounded-2xl bg-white/65 p-3 text-center">
                <p className="font-display text-xl font-black text-rose-400">{stats.unknown}</p>
                <p className="text-[10px] font-bold text-[#a398ae]">需加强</p>
              </div>
              <div className="rounded-2xl bg-white/65 p-3 text-center">
                <p className="font-display text-xl font-black text-[#4b4459]">{progress}%</p>
                <p className="text-[10px] font-bold text-[#a398ae]">完成度</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="section-kicker">TIPS</p>
            <ul className="mt-2.5 space-y-2 text-xs font-semibold leading-relaxed text-[#7e7489]">
              <li>· 先听发音，再判断是否认识。</li>
              <li>· 不确定就点“查看答案”，不扣分。</li>
              <li>· 不认识的词会在稍后自动复现。</li>
            </ul>
          </div>

          <button type="button" className="btn-secondary w-full" onClick={restart}>
            <RotateCcw size={16} />
            重新开始本轮
          </button>
        </aside>
      </div>

      <Modal open={settingsOpen} title="语言与音色" onClose={() => setSettingsOpen(false)}>
        <VoicePicker />
      </Modal>
    </div>
  );
}
