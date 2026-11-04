import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Volume2,
  Wand2
} from 'lucide-react';
import { AiSearch } from '../components/AiSearch';
import { ImportWords } from '../components/ImportWords';
import { Mascot } from '../components/Mascot';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { VoicePicker } from '../components/VoicePicker';
import { WordCard } from '../components/WordCard';
import { playText, stopAudio } from '../lib/audio';
import { startQuiz } from '../lib/quizEngine';
import { sleep } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

export default function StudyPage() {
  const words = useAppStore((state) => state.words);
  const fileName = useAppStore((state) => state.fileName);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const masteredCount = useAppStore((state) => state.masteredCount);
  const settings = useAppStore((state) => state.settings);
  const setWords = useAppStore((state) => state.setWords);
  const removeWordAt = useAppStore((state) => state.removeWordAt);
  const setCurrentIndex = useAppStore((state) => state.setCurrentIndex);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setQuiz = useAppStore((state) => state.setQuiz);
  const toast = useToast();
  const navigate = useNavigate();

  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playingWord, setPlayingWord] = useState(false);
  const [playingExample, setPlayingExample] = useState(false);

  const wordsRef = useRef(words);
  const currentIndexRef = useRef(currentIndex);
  const settingsRef = useRef(settings);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (words.length && currentIndex >= words.length) {
      setCurrentIndex(words.length - 1);
    }
  }, [currentIndex, setCurrentIndex, words.length]);

  const current = words[Math.min(currentIndex, Math.max(0, words.length - 1))];
  const progress = words.length ? ((currentIndex + 1) / words.length) * 100 : 0;
  const autoOn = settings.autoPlayMode !== 'off';

  const playWord = async () => {
    if (!current) return;
    stopAudio();
    setPlayingWord(true);
    await playText(current.word, settings.languageCode, settings.voiceId);
    setPlayingWord(false);
  };

  const playExample = async () => {
    if (!current?.example) return;
    stopAudio();
    setPlayingExample(true);
    await playText(current.example, settings.languageCode, settings.voiceId);
    setPlayingExample(false);
  };

  const go = (delta: number) => {
    if (words.length === 0) return;
    stopAudio();
    const next = settings.randomMode
      ? Math.floor(Math.random() * words.length)
      : (currentIndex + delta + words.length) % words.length;
    setCurrentIndex(next);
  };

  const markMastered = () => {
    if (!current) return;
    stopAudio();
    removeWordAt(currentIndex, true);
    toast('已标记掌握，单词从本轮词表移除', 'success');
  };

  const startTest = () => {
    if (words.length === 0) {
      toast('先导入或添加一些单词吧', 'error');
      return;
    }
    stopAudio();
    setQuiz(startQuiz(words));
    navigate('/quiz');
  };

  // 自动播放：单词模式 / 单词+例句模式，间隔与随机均与小程序逻辑一致
  useEffect(() => {
    if (settings.autoPlayMode === 'off' || words.length === 0) return;
    let cancelled = false;

    const run = async () => {
      while (!cancelled) {
        const list = wordsRef.current;
        if (list.length === 0) break;
        const idx = Math.min(currentIndexRef.current, list.length - 1);
        const word = list[idx];
        if (!word) break;

        setPlayingWord(true);
        await playText(word.word, settingsRef.current.languageCode, settingsRef.current.voiceId);
        setPlayingWord(false);
        if (cancelled) break;

        if (settingsRef.current.autoPlayMode === 'wordExample' && word.example) {
          setPlayingExample(true);
          await playText(word.example, settingsRef.current.languageCode, settingsRef.current.voiceId);
          setPlayingExample(false);
        }
        if (cancelled) break;

        await sleep(settingsRef.current.interval * 1000);
        if (cancelled) break;

        const latest = wordsRef.current;
        if (latest.length === 0) break;
        const latestIndex = Math.min(currentIndexRef.current, latest.length - 1);
        const next = settingsRef.current.randomMode
          ? Math.floor(Math.random() * latest.length)
          : (latestIndex + 1) % latest.length;
        setCurrentIndex(next);
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopAudio();
      setPlayingWord(false);
      setPlayingExample(false);
    };
  }, [setCurrentIndex, settings.autoPlayMode, settings.interval, settings.randomMode, words.length]);

  return (
    <div className="page-shell">
      {words.length === 0 ? (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2.4rem] border border-white/80 bg-white/55 p-6 shadow-soft backdrop-blur-2xl md:p-10">
            <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-sakura/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-sky/20 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="chip bg-white/80 text-sakura-deep">
                  <Sparkles size={13} />
                  多语言 · AI 词卡 · 自动听写
                </span>
                <h1 className="mt-4 font-display text-4xl font-black leading-[1.08] tracking-tight text-[#3f3a4f] md:text-6xl">
                  把背单词，
                  <br />
                  变成一件<span className="text-sakura-deep">可爱的小事</span>。
                </h1>
                <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-[#7e7489] md:text-base">
                  小满记词支持 AI 查词、Excel / JSON 词表导入、卡片式学习、自动发音和智能测验。
                  先选一个词表，或者让 AI 帮你生成今天要学的词。
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['🤖 AI 智能', '🌍 多语言', '📚 卡片学习', '🔊 自动发音', '📝 自助听写', '📊 智能测验'].map(
                    (tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    )
                  )}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary" onClick={() => setImportOpen(true)}>
                    <Upload size={17} />
                    导入词表
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setAiOpen(true)}>
                    <Wand2 size={17} />
                    AI 查词加词
                  </button>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[300px]">
                <div className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-sakura/30 to-sky/30 blur-2xl" />
                <div className="float-slow relative rounded-[2.6rem] border border-white/80 bg-white/65 p-7 shadow-soft backdrop-blur-xl">
                  <Mascot size={210} className="mx-auto" />
                  <div className="mt-1 rounded-2xl bg-white/70 px-4 py-3 text-center ring-1 ring-white/80">
                    <p className="font-display text-sm font-black text-[#4b4459]">“今天也要记住一点点呀”</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#a398ae]">—— 小满书灵</p>
                  </div>
                </div>
                <span className="absolute -left-3 top-8 rotate-[-10deg] rounded-xl bg-lemon px-3 py-1.5 text-xs font-black text-[#7b5c00] shadow-md">
                  NEW!
                </span>
                <span className="sparkle absolute -right-2 bottom-16 rounded-full bg-white/90 p-2 text-sakura-deep shadow-md">
                  <Sparkles size={18} />
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-card p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">AI SEARCH</p>
                  <h2 className="section-title mt-1">AI 查词</h2>
                </div>
                <span className="chip bg-sakura/10 text-sakura-deep">
                  <Wand2 size={13} />
                  DeepSeek
                </span>
              </div>
              <AiSearch />
            </div>

            <div className="glass-card p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">IMPORT</p>
                  <h2 className="section-title mt-1">导入词表</h2>
                </div>
                <span className="chip bg-sky/10 text-[#5d8fa9]">
                  <FileText size={13} />
                  Excel / JSON
                </span>
              </div>
              <ImportWords onImported={(next, name) => setWords(next, name)} />
            </div>
          </section>

          <section className="glass-card overflow-hidden p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">HOW IT WORKS</p>
                <h2 className="section-title mt-1">三步开始今天的学习</h2>
              </div>
              <span className="chip">无需注册 · 数据保存在本地</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: '📥', title: '导入或生成', desc: '选择词表文件、粘贴链接，或让 AI 生成词卡。' },
                { icon: '🎧', title: '听 + 看 + 记', desc: '点击发音，自动播放单词和例句，标记已掌握。' },
                { icon: '🎯', title: '测验巩固', desc: '随机听写，错词自动复现，再测直到全部掌握。' }
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/80 bg-white/60 p-4">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="mt-2 font-display text-base font-black text-[#4b4459]">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-[#91869d]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="glass-card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker">STUDY DECK</p>
                <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-black tracking-tight text-[#3f3a4f] md:text-3xl">
                  <FileText size={22} className="text-sakura-deep" />
                  <span className="truncate">{fileName || '我的词表'}</span>
                </h1>
                <p className="mt-1.5 text-xs font-semibold text-[#91869d]">
                  共 {words.length} 词 · 已掌握 {masteredCount} · 当前第 {currentIndex + 1} 个
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setAiOpen(true)}>
                  <Wand2 size={15} />
                  AI 加词
                </button>
                <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setImportOpen(true)}>
                  <Upload size={15} />
                  重新导入
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="学习设置"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="progress-track flex-1">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-display text-xs font-black text-[#9b90a7]">{Math.round(progress)}%</span>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              {current && (
                <div key={current.id} className="pop-in">
                  <WordCard
                    word={current}
                    playingWord={playingWord}
                    playingExample={playingExample}
                    onPlayWord={() => void playWord()}
                    onPlayExample={() => void playExample()}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => go(-1)}>
                  <ArrowLeft size={17} />
                  上一个
                </button>
                <button type="button" className="btn-primary flex-[1.3] bg-gradient-to-r from-mint to-[#5fd3a8]" onClick={markMastered}>
                  <Check size={18} />
                  已掌握
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => go(1)}>
                  下一个
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn-secondary" onClick={() => void playWord()} disabled={playingWord}>
                  {playingWord ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  {playingWord ? '播放中' : '播放单词'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void playExample()}
                  disabled={!current?.example || playingExample}
                >
                  {playingExample ? <Loader2 size={16} className="animate-spin" /> : <Headphones size={16} />}
                  {playingExample ? '播放中' : '播放例句'}
                </button>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <p className="section-kicker">AUTO PLAY</p>
                  {autoOn ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      播放中
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-[#b0a5ba]">已关闭</span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { value: 'off', label: '关闭自动播放', icon: Pause },
                    { value: 'word', label: '自动播放单词', icon: Play },
                    { value: 'wordExample', label: '单词 + 例句', icon: Headphones }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (value === 'off') stopAudio();
                        updateSettings({ autoPlayMode: value as typeof settings.autoPlayMode });
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-sm font-extrabold transition ${
                        settings.autoPlayMode === value
                          ? 'bg-gradient-to-r from-sakura/18 to-sky/15 text-[#4b4459] ring-1 ring-sakura/25'
                          : 'text-[#7e7489] hover:bg-white/70'
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-xl ${
                          settings.autoPlayMode === value ? 'bg-white text-sakura-deep' : 'bg-white/60 text-[#9b90a7]'
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>

                <div className={`mt-4 space-y-3 transition ${autoOn ? 'opacity-100' : 'pointer-events-none opacity-45'}`}>
                  <div className="flex items-center justify-between rounded-2xl bg-white/60 px-3.5 py-3">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-[#5f5872]">
                      <Shuffle size={15} className="text-grape" />
                      随机播放
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.randomMode}
                      onClick={() => updateSettings({ randomMode: !settings.randomMode })}
                      className={`relative h-7 w-12 rounded-full transition ${
                        settings.randomMode ? 'bg-gradient-to-r from-sakura to-[#f26f99]' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          settings.randomMode ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <label className="flex items-center justify-between rounded-2xl bg-white/60 px-3.5 py-3">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-[#5f5872]">
                      <Timer size={15} className="text-sky" />
                      播放间隔
                    </span>
                    <select
                      className="select-field w-auto py-1.5"
                      value={settings.interval}
                      onChange={(event) => updateSettings({ interval: Number(event.target.value) })}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((second) => (
                        <option key={second} value={second}>
                          {second} 秒
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  className="btn-secondary mt-4 w-full py-2.5 text-xs"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={15} />
                  语言与音色设置
                </button>
              </div>

              <div className="glass-card p-5">
                <p className="section-kicker">QUICK ACTIONS</p>
                <div className="mt-3 space-y-2">
                  <button type="button" className="btn-primary w-full" onClick={startTest}>
                    <Headphones size={17} />
                    进入听写测验
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => {
                      stopAudio();
                      updateSettings({ autoPlayMode: 'off' });
                      setCurrentIndex(0);
                      toast('已回到第一个单词', 'info');
                    }}
                  >
                    <RotateCcw size={16} />
                    回到开头
                  </button>
                  <button
                    type="button"
                    className="btn-ghost w-full text-rose-500 hover:bg-rose-50"
                    onClick={() => {
                      if (!window.confirm('确定清空当前词表吗？此操作不可撤销。')) return;
                      stopAudio();
                      setWords([], '');
                      toast('词表已清空', 'success');
                    }}
                  >
                    <Trash2 size={15} />
                    清空词表
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      <Modal open={importOpen} title="导入词表" onClose={() => setImportOpen(false)} wide>
        <ImportWords
          onImported={(next, name) => {
            setWords(next, name);
            setImportOpen(false);
            toast(`已载入 ${next.length} 个单词`, 'success');
          }}
        />
      </Modal>

      <Modal open={aiOpen} title="AI 查词加词" onClose={() => setAiOpen(false)} wide>
        <AiSearch />
      </Modal>

      <Modal open={settingsOpen} title="语言与音色" onClose={() => setSettingsOpen(false)}>
        <VoicePicker />
      </Modal>
    </div>
  );
}
