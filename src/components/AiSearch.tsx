import { useState } from 'react';
import { Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import { aiSearch } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Word } from '../types';
import { useToast } from './Toast';

export function AiSearch({ onAdded }: { onAdded?: () => void }) {
  const languages = useAppStore((state) => state.languages);
  const settings = useAppStore((state) => state.settings);
  const addWords = useAppStore((state) => state.addWords);
  const addHistory = useAppStore((state) => state.addHistory);
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentLanguage =
    languages.find((language) => language.code === settings.languageCode)?.name ||
    settings.languageCode;

  const search = async () => {
    const value = query.trim();
    if (!value) {
      toast('先输入一个单词或主题吧', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const words = await aiSearch(value, currentLanguage, settings.languageCode);
      setResults(words);
      addHistory(words);
      toast(`AI 找到 ${words.length} 个词条`, 'success');
    } catch (err) {
      setError((err as Error).message || 'AI 查词失败');
    } finally {
      setLoading(false);
    }
  };

  const add = (word: Word) => {
    const added = addWords([word]);
    toast(added > 0 ? `已加入词表：${word.word}` : '词表里已经有这个词了', added > 0 ? 'success' : 'info');
    if (added > 0) onAdded?.();
  };

  const addAll = () => {
    const added = addWords(results);
    toast(added > 0 ? `已加入 ${added} 个单词` : '这些词都已经在词表里了', added > 0 ? 'success' : 'info');
    if (added > 0) onAdded?.();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#b2a6bd]" size={18} />
        <input
          className="field py-3.5 pl-11 pr-28"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void search();
          }}
          placeholder="输入中文或外文，试试：serendipity / 10个旅行英语"
        />
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-sakura to-[#f26f99] px-4 py-2 text-xs font-black text-white shadow-md disabled:opacity-60"
          disabled={loading}
          onClick={() => void search()}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? '查询中' : 'AI 查词'}
        </button>
      </div>
      <p className="px-1 text-[11px] font-semibold text-[#a398ae]">
        当前目标语言：<span className="font-black text-[#7a6f88]">{currentLanguage}</span>
        ，AI 会按该语言生成词卡。
      </p>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 p-3 text-sm font-semibold text-rose-600">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="关闭错误">
            <X size={16} />
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="section-kicker">AI RESULTS · {results.length}</span>
            <button type="button" className="btn-ghost text-xs" onClick={addAll}>
              <Plus size={14} />
              全部加入
            </button>
          </div>
          <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {results.map((word) => (
              <div
                key={word.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/80 bg-white/72 p-3.5 shadow-sm ring-1 ring-white/60"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-lg font-black text-[#4b4459]">{word.word}</span>
                    {word.phonetic && <span className="text-xs font-bold text-[#a398ae]">{word.phonetic}</span>}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[#696174]">{word.definition}</p>
                  {word.example && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#9b90a7]">{word.example}</p>
                  )}
                </div>
                <button type="button" className="icon-btn h-9 w-9 shrink-0" onClick={() => add(word)} aria-label={`加入 ${word.word}`}>
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
