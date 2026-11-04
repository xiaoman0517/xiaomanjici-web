import { useRef, useState } from 'react';
import { FileSpreadsheet, Link2, Loader2, Upload } from 'lucide-react';
import { parseWordFile, parseWordUrl, fileNameFromUrl } from '../lib/parseWords';
import type { Word } from '../types';
import { useToast } from './Toast';

export function ImportWords({
  onImported,
  compact = false
}: {
  onImported: (words: Word[], fileName: string) => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();

  const loadFile = async (file: File) => {
    setBusy(true);
    try {
      const words = await parseWordFile(file);
      onImported(words, file.name);
      toast(`导入成功：${words.length} 个单词`, 'success');
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
      const words = await parseWordUrl(value);
      onImported(words, fileNameFromUrl(value));
      setUrl('');
      toast(`导入成功：${words.length} 个单词`, 'success');
    } catch (error) {
      toast((error as Error).message || '链接导入失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
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
          表格建议 5 列：单词、音标、释义、例句、例句翻译
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
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a99fb4]" size={16} />
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
    </div>
  );
}
