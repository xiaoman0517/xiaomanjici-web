import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Download,
  History,
  Languages,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  UserRound
} from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { VoicePicker } from '../components/VoicePicker';
import { WordCard } from '../components/WordCard';
import { downloadText } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import type { Word } from '../types';

export default function ProfilePage() {
  const words = useAppStore((state) => state.words);
  const masteredCount = useAppStore((state) => state.masteredCount);
  const history = useAppStore((state) => state.history);
  const quiz = useAppStore((state) => state.quiz);
  const removeHistory = useAppStore((state) => state.removeHistory);
  const clearHistory = useAppStore((state) => state.clearHistory);
  const resetAll = useAppStore((state) => state.resetAll);
  const toast = useToast();
  const [selected, setSelected] = useState<Word | null>(null);

  const exportHistory = () => {
    if (history.length === 0) {
      toast('搜索历史为空', 'error');
      return;
    }
    const text = history
      .map((word) =>
        [word.word, word.phonetic, word.definition, word.example, word.exampleTranslation]
          .filter(Boolean)
          .join('\t')
      )
      .join('\n');
    downloadText(text, `小满记词-搜索历史-${new Date().toISOString().slice(0, 10)}.txt`);
    toast('历史记录已导出', 'success');
  };

  return (
    <div className="page-shell space-y-4">
      <section className="glass-card overflow-hidden p-6 md:p-8">
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="section-kicker">MY SPACE</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-black tracking-tight text-[#3f3a4f] md:text-4xl">
              <UserRound size={28} className="text-sakura-deep" />
              我的学习空间
            </h1>
            <p className="mt-2 max-w-lg text-sm font-semibold leading-relaxed text-[#91869d]">
              数据默认保存在浏览器本地。换设备或清理浏览器数据后不会自动同步，重要词表记得导出备份。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { icon: BookOpen, label: '当前词表', value: words.length, tint: 'bg-sky/15 text-[#5d8fa9]' },
                { icon: Trophy, label: '已掌握', value: masteredCount, tint: 'bg-lemon/25 text-[#a47d00]' },
                { icon: History, label: '搜索历史', value: history.length, tint: 'bg-grape/15 text-grape' },
                { icon: Sparkles, label: '待加强', value: quiz.unknown.length, tint: 'bg-sakura/15 text-sakura-deep' }
              ].map(({ icon: Icon, label, value, tint }) => (
                <div key={label} className="rounded-2xl border border-white/80 bg-white/65 p-3">
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${tint}`}>
                    <Icon size={15} />
                  </span>
                  <p className="mt-2 font-display text-xl font-black text-[#4b4459]">{value}</p>
                  <p className="text-[10px] font-bold text-[#a398ae]">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <Mascot size={160} className="float-slow mx-auto hidden md:block" />
        </div>
      </section>

      <section className="glass-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">SETTINGS</p>
            <h2 className="section-title mt-1 flex items-center gap-2">
              <Languages size={20} className="text-sky" />
              语言与发音
            </h2>
          </div>
        </div>
        <VoicePicker />
      </section>

      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">SEARCH HISTORY</p>
            <h2 className="section-title mt-1 flex items-center gap-2">
              <History size={20} className="text-grape" />
              搜索历史
              {history.length > 0 && <span className="text-sm font-black text-[#a398ae]">({history.length})</span>}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={exportHistory}>
              <Download size={15} />
              导出文本
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2 text-xs text-rose-500 hover:bg-rose-50"
              onClick={() => {
                if (history.length === 0) return;
                if (!window.confirm('确定清空全部搜索历史吗？')) return;
                clearHistory();
                toast('搜索历史已清空', 'success');
              }}
            >
              <Trash2 size={15} />
              清空历史
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#e7d9e2] bg-white/45 p-8 text-center">
            <p className="text-3xl">📚</p>
            <p className="mt-2 text-sm font-black text-[#5f5872]">还没有搜索历史</p>
            <p className="mt-1 text-xs font-semibold text-[#a398ae]">去学习页用 AI 查几个词，它们会出现在这里。</p>
            <Link to="/" className="btn-secondary mt-4 px-4 py-2 text-xs">
              去查词
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {history.map((word) => (
              <div
                key={word.id}
                className="group flex items-start gap-3 rounded-2xl border border-white/75 bg-white/58 p-3.5 transition hover:bg-white/85"
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(word)}>
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-base font-black text-[#4b4459]">{word.word}</span>
                    {word.phonetic && <span className="text-[11px] font-bold text-[#a398ae]">{word.phonetic}</span>}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-relaxed text-[#7e7489]">
                    {word.definition}
                  </p>
                </button>
                <button
                  type="button"
                  className="icon-btn h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100"
                  onClick={() => removeHistory(word.id)}
                  aria-label={`删除 ${word.word}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5 md:p-6">
          <p className="section-kicker">ABOUT</p>
          <h2 className="section-title mt-1">关于小满记词</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#7e7489]">
            小满记词是一款多语言单词学习与听写测验工具，支持 AI 查词、词表导入、卡片学习、自动发音和错词复测。
            当前 Web 版本数据保存在本地浏览器。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">🤖 AI 查词</span>
            <span className="chip">🌍 多语言</span>
            <span className="chip">🔊 Polly TTS</span>
            <span className="chip">📊 智能测验</span>
          </div>
        </div>

        <div className="glass-card p-5 md:p-6">
          <p className="section-kicker">DATA</p>
          <h2 className="section-title mt-1">本地数据</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#7e7489]">
            词表、学习进度、搜索历史和设置都保存在当前浏览器。清理浏览器数据会一并清除。
          </p>
          <button
            type="button"
            className="btn-secondary mt-4 w-full border-rose-100 text-rose-500 hover:bg-rose-50"
            onClick={() => {
              if (!window.confirm('确定清除所有本地数据吗？词表、历史、设置都会被清空。')) return;
              resetAll();
              toast('本地数据已清除', 'success');
            }}
          >
            <RotateCcw size={16} />
            清除所有本地数据
          </button>
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] font-bold tracking-[0.14em] text-[#b2a6bd]">
        DEDICATED TO MULTILINGUAL LEARNERS · 小满记词
      </p>

      <Modal open={Boolean(selected)} title="单词详情" onClose={() => setSelected(null)}>
        {selected && <WordCard word={selected} />}
      </Modal>
    </div>
  );
}
