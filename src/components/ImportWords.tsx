import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  FileSpreadsheet,
  Folder,
  Globe2,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { fetchAllWordLists } from '../lib/api';
import { parseWordListResource } from '../lib/importResource';
import {
  categoryFromLanguage,
  chooseDefaultVoice,
  detectLanguage,
  DISCOVER_CATEGORIES,
  languageFromCategory,
  languageLabel,
  resolveLanguageCode,
  type LanguageDetection
} from '../lib/language';
import { fileNameFromUrl, parseWordFile, parseWordUrl, type FirstRowMode } from '../lib/parseWords';
import { formatDate, formatFileSize } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import type { Word, WordListEntry } from '../types';
import { useToast } from './Toast';

type Tab = 'local' | 'discover';

interface PendingImport {
  words: Word[];
  fileName: string;
  detection: LanguageDetection;
}

export function ImportWords({
  onImported,
  compact = false
}: {
  onImported: (words: Word[], fileName: string) => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const resourceCache = useRef(new Map<string, WordListEntry[]>());

  const languages = useAppStore((state) => state.languages);
  const allVoices = useAppStore((state) => state.allVoices);
  const settings = useAppStore((state) => state.settings);
  const voiceByLanguage = useAppStore((state) => state.voiceByLanguage);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setVoice = useAppStore((state) => state.setVoice);
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('local');
  const [firstRowMode, setFirstRowMode] = useState<FirstRowMode>('auto');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [pendingLanguage, setPendingLanguage] = useState(settings.languageCode);
  const [pendingVoice, setPendingVoice] = useState(settings.voiceId);

  const [resourceCategory, setResourceCategory] = useState(() => categoryFromLanguage(settings.languageCode));
  const [resources, setResources] = useState<WordListEntry[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');
  const [importingKey, setImportingKey] = useState('');

  const pendingVoices = useMemo(
    () => allVoices.filter((voice) => voice.LanguageCode === pendingLanguage),
    [allVoices, pendingLanguage]
  );

  const detectAndPrepare = (words: Word[], fileName: string, preferredCode = '') => {
    const detection = detectLanguage(words, fileName);
    const shouldPreferCategory = Boolean(preferredCode) && detection.confidence < 0.55;
    const code = resolveLanguageCode(shouldPreferCategory ? preferredCode : detection.code, languages);
    const voices = allVoices.filter((voice) => voice.LanguageCode === code);
    const voiceId = chooseDefaultVoice(
      voices,
      code,
      voiceByLanguage[code] || (code === settings.languageCode ? settings.voiceId : undefined)
    );

    const fallbackNote =
      detection.code !== code
        ? `；当前音色库暂不支持 ${detection.code}，已回退到 ${languageLabel(code, languages)}`
        : '';

    setPending({
      words,
      fileName,
      detection: {
        code,
        confidence: shouldPreferCategory ? Math.max(0.55, detection.confidence) : detection.confidence,
        reason:
          (shouldPreferCategory
            ? `已按所选资源分类预选 ${languageLabel(code, languages)}，请确认`
            : detection.reason) + fallbackNote
      }
    });
    setPendingLanguage(code);
    setPendingVoice(voiceId);
  };

  const loadFile = async (file: File) => {
    setBusy(true);
    try {
      const words = await parseWordFile(file, { firstRowMode });
      detectAndPrepare(words, file.name);
    } catch (error) {
      toast((error as Error).message || '文件解析失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadUrl = async () => {
    const value = url.trim();
    if (!value) {
      toast('请输入词表链接', 'error');
      return;
    }
    if (!/^https?:\/\//i.test(value)) {
      toast('请输入 http/https 链接', 'error');
      return;
    }
    setBusy(true);
    try {
      const words = await parseWordUrl(value, { firstRowMode });
      detectAndPrepare(words, fileNameFromUrl(value));
      setUrl('');
    } catch (error) {
      toast((error as Error).message || '链接导入失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadResources = async (category: string, force = false) => {
    if (!force && resourceCache.current.has(category)) {
      setResources(resourceCache.current.get(category) || []);
      setResourceError('');
      return;
    }
    setResourceLoading(true);
    setResourceError('');
    try {
      const list = await fetchAllWordLists(category);
      const usable = list.filter((item) => item.s3Key || item.key);
      resourceCache.current.set(category, usable);
      setResources(usable);
      if (usable.length === 0) setResourceError('这个分类下还没有共享词表');
    } catch (error) {
      setResources([]);
      setResourceError((error as Error).message || '推荐词表加载失败');
    } finally {
      setResourceLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'discover') return;
    void loadResources(resourceCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, resourceCategory]);

  const importResource = async (entry: WordListEntry) => {
    const key = entry.s3Key || entry.key || entry.fileName;
    setImportingKey(key);
    try {
      const words = await parseWordListResource(entry, { firstRowMode });
      detectAndPrepare(words, entry.fileName, languageFromCategory(resourceCategory));
    } catch (error) {
      toast((error as Error).message || '词表导入失败', 'error');
    } finally {
      setImportingKey('');
    }
  };

  const changePendingLanguage = (code: string) => {
    const voices = allVoices.filter((voice) => voice.LanguageCode === code);
    setPendingLanguage(code);
    setPendingVoice(chooseDefaultVoice(voices, code, voiceByLanguage[code]));
  };

  const confirmImport = () => {
    if (!pending) return;
    setLanguage(pendingLanguage);
    if (pendingVoice) setVoice(pendingVoice);
    onImported(pending.words, pending.fileName);
    setPending(null);
  };

  if (pending) {
    const confidence = Math.round(pending.detection.confidence * 100);
    const detectedLabel = languageLabel(pending.detection.code, languages);

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-[#fff7fb] to-[#f1f9ff] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-[#a398ae]">
                <Sparkles size={13} className="text-sakura-deep" />
                IMPORT PREVIEW
              </p>
              <h3 className="mt-1 font-display text-xl font-black text-[#3f3a4f]">
                已解析 {pending.words.length} 个单词
              </h3>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#91869d]">{pending.fileName}</p>
            </div>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-sakura-deep ring-1 ring-sakura/20">
              {confidence}% 置信度
            </span>
          </div>

          <div className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3 ring-1 ring-white/80">
            <p className="flex items-center gap-2 text-sm font-black text-[#4b4459]">
              <Globe2 size={16} className="text-sky" />
              检测语言：{detectedLabel}
              <span className="text-[11px] font-bold text-[#a398ae]">{pending.detection.code}</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#91869d]">
              {pending.detection.reason}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black tracking-[0.16em] text-[#9b90a7]">
              学习语言
            </span>
            <select
              className="select-field"
              value={pendingLanguage}
              onChange={(event) => changePendingLanguage(event.target.value)}
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name} · {language.code}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black tracking-[0.16em] text-[#9b90a7]">
              默认音色
            </span>
            <select
              className="select-field"
              value={pendingVoice}
              onChange={(event) => setPendingVoice(event.target.value)}
            >
              {pendingVoices.length === 0 && <option value="">暂无可用音色</option>}
              {pendingVoices.map((voice) => (
                <option key={voice.Id} value={voice.Id}>
                  {voice.Name}
                  {voice.Gender
                    ? ` · ${voice.Gender === 'Female' ? '女声' : voice.Gender === 'Male' ? '男声' : voice.Gender}`
                    : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="rounded-2xl bg-white/55 px-3.5 py-3 text-[11px] font-semibold leading-relaxed text-[#91869d]">
          检测结果不确定时可以直接改语言和音色。确认后会立即切换到该语言，并把该音色保存为这门语言的默认音色。
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={() => setPending(null)}>
            返回重新选择
          </button>
          <button type="button" className="btn-primary flex-[1.2]" onClick={confirmImport}>
            <Check size={17} />
            确认导入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex rounded-full border border-white/80 bg-white/55 p-1">
        <button
          type="button"
          onClick={() => setTab('local')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition ${
            tab === 'local' ? 'bg-white text-[#4b4459] shadow-sm' : 'text-[#9b90a7]'
          }`}
        >
          <Upload size={14} />
          本地 / 链接
        </button>
        <button
          type="button"
          onClick={() => setTab('discover')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition ${
            tab === 'discover' ? 'bg-white text-[#4b4459] shadow-sm' : 'text-[#9b90a7]'
          }`}
        >
          <Globe2 size={14} />
          发现页推荐
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/50 px-3 py-2">
        <div>
          <p className="text-[11px] font-black text-[#6b6478]">首行处理</p>
          <p className="text-[10px] font-semibold text-[#a398ae]">列名不参与映射，按第 1~5 列顺序读取</p>
        </div>
        <select
          className="select-field w-auto py-1.5 text-xs"
          value={firstRowMode}
          onChange={(event) => setFirstRowMode(event.target.value as FirstRowMode)}
        >
          <option value="auto">自动识别表头</option>
          <option value="header">首行是表头</option>
          <option value="data">首行是数据</option>
        </select>
      </div>

      {tab === 'local' ? (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void loadFile(file);
            }}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-7 text-center transition ${
              dragging
                ? 'border-sakura bg-sakura/10'
                : 'border-[#e7d9e2] bg-white/55 hover:border-sakura/70 hover:bg-white/80'
            }`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#fff0f6] to-[#eef7ff] text-sakura-deep shadow-inner ring-1 ring-white">
              {busy ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
            </span>
            <p className="mt-3 font-display text-base font-black text-[#4f485f]">
              {busy ? '正在解析…' : '点击选择，或拖拽词表到这里'}
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#9b90a7]">
              支持 .xlsx / .xls / .csv / .json
              <br />
              列名可自定义，按第 1~5 列顺序读取：单词、音标、释义、例句、例句翻译
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
                event.target.value = '';
              }}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a99fb4]"
                size={16}
              />
              <input
                className="field pl-10"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void loadUrl();
                }}
                placeholder="或粘贴词表直链 https://..."
              />
            </div>
            <button type="button" className="btn-secondary shrink-0" onClick={() => void loadUrl()} disabled={busy}>
              <FileSpreadsheet size={16} />
              链接导入
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select-field flex-1"
              value={resourceCategory}
              onChange={(event) => setResourceCategory(event.target.value)}
            >
              {DISCOVER_CATEGORIES.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.flag} {item.label} / {item.category}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() => void loadResources(resourceCategory, true)}
              disabled={resourceLoading}
              aria-label="刷新推荐词表"
            >
              <RefreshCw size={17} className={resourceLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="section-kicker">DISCOVER RESOURCES</span>
            <span className="text-[11px] font-bold text-[#a398ae]">
              {resourceLoading ? '加载中…' : `共 ${resources.length} 个`}
            </span>
          </div>

          {resourceError && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 p-3 text-xs font-semibold leading-relaxed text-rose-600">
              <span>{resourceError}</span>
              <button type="button" onClick={() => setResourceError('')} aria-label="关闭">
                <X size={14} />
              </button>
            </div>
          )}

          {resourceLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl bg-white/55 p-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-200/70" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-slate-200/70" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-200/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7d9e2] bg-white/45 p-7 text-center">
              <p className="text-3xl">📭</p>
              <p className="mt-2 text-sm font-black text-[#5f5872]">暂无可导入的推荐词表</p>
              <p className="mt-1 text-xs font-semibold text-[#a398ae]">
                可以换个语言分类，或直接使用本地文件 / 链接导入。
              </p>
            </div>
          ) : (
            <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
              {resources.map((entry) => {
                const key = entry.s3Key || entry.key || entry.fileName;
                const folder = key.includes('/')
                  ? key.slice(key.indexOf('/') + 1, key.lastIndexOf('/'))
                  : '';
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-white/75 bg-white/58 p-3 transition hover:bg-white/85"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100/70 text-emerald-600">
                      <FileSpreadsheet size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-black text-[#4b4459]">{entry.fileName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#a398ae]">
                        {(entry.fileSize || entry.size || 0) > 0 && (
                          <span>{formatFileSize(entry.fileSize || entry.size)}</span>
                        )}
                        {entry.lastModified && <span>{formatDate(entry.lastModified)}</span>}
                        {folder && (
                          <span className="flex items-center gap-0.5">
                            <Folder size={10} />
                            {folder}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                      onClick={() => void importResource(entry)}
                      disabled={Boolean(importingKey)}
                    >
                      {importingKey === key ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                      {importingKey === key ? '导入中' : '导入'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="px-1 text-[11px] font-semibold leading-relaxed text-[#a398ae]">
            推荐词表来自发现页共享资源。导入后仍会显示语言识别结果，确认后再加入学习。
          </p>
        </div>
      )}
    </div>
  );
}
