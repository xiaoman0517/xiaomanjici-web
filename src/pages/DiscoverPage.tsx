import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CloudUpload,
  Download,
  FileJson,
  FileSpreadsheet,
  Folder,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  X
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { downloadResource, fetchAllWordLists, uploadResource } from '../lib/api';
import { base64ToBytes, downloadBlob, fileToBase64, formatDate, formatFileSize } from '../lib/utils';
import type { WordListEntry } from '../types';

const categories = [
  { label: '英语', flag: '🇺🇸', category: 'English', desc: 'English' },
  { label: '法语', flag: '🇫🇷', category: 'French', desc: 'Français' },
  { label: '日语', flag: '🇯🇵', category: 'Japanese', desc: '日本語' },
  { label: '西班牙语', flag: '🇪🇸', category: 'Spanish', desc: 'Español' },
  { label: '俄语', flag: '🇷🇺', category: 'Russian', desc: 'Русский' },
  { label: '德语', flag: '🇩🇪', category: 'German', desc: 'Deutsch' },
  { label: '意大利语', flag: '🇮🇹', category: 'Italian', desc: 'Italiano' },
  { label: '韩语', flag: '🇰🇷', category: 'Korean', desc: '한국어' },
  { label: '阿拉伯语', flag: '🇸🇦', category: 'Arabic', desc: 'العربية' },
  { label: '其他', flag: '🌍', category: 'Other', desc: 'Other resources' }
];

interface DecoratedEntry extends WordListEntry {
  key: string;
  folderPath: string;
  size: number;
}

interface PreviewState {
  title: string;
  rows?: string[][];
  text?: string;
}

export default function DiscoverPage() {
  const toast = useToast();
  const [selected, setSelected] = useState<(typeof categories)[number] | null>(null);
  const [items, setItems] = useState<DecoratedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [path, setPath] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('English');
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const decorate = (list: WordListEntry[], category: string): DecoratedEntry[] => {
    const prefix = `official/${category}/`;
    return list
      .map((item) => {
        const key = item.s3Key || item.key || '';
        let folderPath = '';
        if (key.startsWith(prefix)) {
          const relative = key.slice(prefix.length);
          const lastSlash = relative.lastIndexOf('/');
          if (lastSlash >= 0) folderPath = relative.slice(0, lastSlash);
        }
        return {
          ...item,
          key,
          folderPath,
          size: item.fileSize || item.size || 0
        };
      })
      .filter((item) => item.key || item.downloadUrl)
      .sort((a, b) => (a.fileName || '').localeCompare(b.fileName || '', 'zh-CN'));
  };

  const load = async (category: string) => {
    setLoading(true);
    setItems([]);
    try {
      const list = await fetchAllWordLists(category);
      setItems(decorate(list, category));
    } catch (error) {
      toast((error as Error).message || '词表列表加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCategory = (category: (typeof categories)[number]) => {
    setSelected(category);
    setPath([]);
    setSearch('');
    void load(category.category);
  };

  const back = () => {
    if (path.length > 0) {
      setPath((current) => current.slice(0, -1));
      return;
    }
    setSelected(null);
    setItems([]);
    setSearch('');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const keyword = search.trim().toLowerCase();
    return items.filter((item) =>
      [item.fileName, item.folderPath, item.category].some((value) =>
        String(value || '').toLowerCase().includes(keyword)
      )
    );
  }, [items, search]);

  const { folders, files } = useMemo(() => {
    if (search.trim()) return { folders: [], files: filtered };
    const currentPath = path.join('/');
    const folderMap = new Map<string, { name: string; path: string[] }>();
    const fileList: DecoratedEntry[] = [];

    filtered.forEach((item) => {
      if (item.folderPath === currentPath) {
        fileList.push(item);
        return;
      }
      const prefix = currentPath ? `${currentPath}/` : '';
      if (!item.folderPath.startsWith(prefix)) return;
      const rest = currentPath ? item.folderPath.slice(currentPath.length + 1) : item.folderPath;
      const next = rest.split('/')[0];
      if (next) folderMap.set(next, { name: next, path: [...path, next] });
    });

    return {
      folders: Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
      files: fileList
    };
  }, [filtered, path, search]);

  const getKey = (entry: DecoratedEntry) => entry.key;

  const previewEntry = async (entry: DecoratedEntry) => {
    const key = getKey(entry);
    if (!key) {
      toast('该文件缺少可下载的对象键', 'error');
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await downloadResource(key, entry.downloadUrl);
      const bytes = base64ToBytes(data.data);
      const lower = entry.fileName.toLowerCase();
      if (lower.endsWith('.json')) {
        const text = new TextDecoder().decode(bytes);
        setPreview({
          title: entry.fileName,
          text: text.length > 4000 ? `${text.slice(0, 4000)}\n\n…（内容过长，已截断）` : text
        });
      } else {
        const XLSX = await import('xlsx');
        const isCsv = entry.fileName.toLowerCase().endsWith('.csv');
        const workbook = isCsv
          ? XLSX.read(new TextDecoder().decode(bytes), { type: 'string' })
          : XLSX.read(bytes, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
        const compact = rows
          .slice(0, 8)
          .map((row) => row.slice(0, 6).map((cell) => String(cell ?? '').slice(0, 80)));
        setPreview({ title: entry.fileName, rows: compact });
      }
    } catch (error) {
      toast((error as Error).message || '预览失败', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadEntry = async (entry: DecoratedEntry) => {
    const key = getKey(entry);
    if (!key) {
      if (entry.downloadUrl) window.open(entry.downloadUrl, '_blank', 'noopener');
      else toast('该文件缺少下载地址', 'error');
      return;
    }
    try {
      toast('正在准备下载…');
      const data = await downloadResource(key, entry.downloadUrl);
      const bytes = base64ToBytes(data.data);
      const lower = entry.fileName.toLowerCase();
      const type = lower.endsWith('.json')
        ? 'application/json'
        : lower.endsWith('.csv')
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type }), data.fileName || entry.fileName);
      toast('下载已开始', 'success');
    } catch (error) {
      toast((error as Error).message || '下载失败', 'error');
    }
  };

  const upload = async () => {
    if (!uploadFile) {
      toast('请先选择文件', 'error');
      return;
    }
    setUploading(true);
    try {
      const fileData = await fileToBase64(uploadFile);
      await uploadResource({
        fileData,
        fileName: uploadFile.name,
        category: uploadCategory,
        description: 'Web 用户上传的单词资源'
      });
      toast('上传成功，等待审核', 'success');
      setUploadOpen(false);
      setUploadFile(null);
    } catch (error) {
      toast((error as Error).message || '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async (entry: DecoratedEntry) => {
    if (!entry.downloadUrl) {
      toast('该文件没有公开链接', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(entry.downloadUrl);
      toast('下载链接已复制', 'success');
    } catch {
      toast(entry.downloadUrl, 'info');
    }
  };

  return (
    <div className="page-shell">
      {!selected ? (
        <div className="space-y-5">
          <section className="glass-card p-6 md:p-8">
            <p className="section-kicker">DISCOVER</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="section-title">发现共享词表</h1>
                <p className="mt-1 text-sm font-semibold text-[#91869d]">
                  选择一门语言，浏览社区整理好的单词资源。
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setUploadOpen(true)}>
                <CloudUpload size={16} />
                共享我的词表
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() => openCategory(item)}
                className="group relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/68 p-4 text-left shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/85 md:p-5"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sakura/15 blur-2xl transition group-hover:bg-sakura/25" />
                <span className="text-3xl md:text-4xl">{item.flag}</span>
                <h2 className="mt-3 font-display text-lg font-black text-[#4b4459]">{item.label}</h2>
                <p className="text-[11px] font-bold tracking-wide text-[#a398ae]">{item.desc}</p>
                <span className="mt-3 flex items-center gap-1 text-[11px] font-black text-sakura-deep">
                  浏览资源
                  <ChevronRight size={13} />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="group relative overflow-hidden rounded-[1.8rem] border border-dashed border-sakura/35 bg-gradient-to-br from-[#fff0f6] to-[#eef7ff] p-4 text-left shadow-soft transition hover:-translate-y-1 hover:bg-white md:p-5"
            >
              <span className="text-3xl md:text-4xl">📤</span>
              <h2 className="mt-3 font-display text-lg font-black text-[#4b4459]">共享词表</h2>
              <p className="text-[11px] font-bold text-[#a398ae]">让更多人受益</p>
              <span className="mt-3 flex items-center gap-1 text-[11px] font-black text-sakura-deep">
                上传资源
                <ChevronRight size={13} />
              </span>
            </button>
          </section>

          <section className="glass-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">COMMUNITY</p>
                <h2 className="section-title mt-1">共享词表说明</h2>
              </div>
              <span className="chip">支持 xlsx / xls / json / csv</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#7e7489]">
              资源来自共享词表库。你可以预览表格内容、下载到本地，或复制链接后在学习页通过 URL 导入。
              上传的表格建议保持 5 列：单词、音标、释义、例句、例句翻译。
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="glass-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" className="icon-btn" onClick={back} aria-label="返回">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className="section-kicker">{selected.desc}</p>
                  <h1 className="mt-0.5 flex items-center gap-2 font-display text-2xl font-black text-[#3f3a4f]">
                    <span>{selected.flag}</span>
                    {path.length ? path[path.length - 1] : `${selected.label}资源`}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs"
                  onClick={() => void load(selected.category)}
                  disabled={loading}
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  刷新
                </button>
                <button type="button" className="btn-primary px-4 py-2 text-xs" onClick={() => setUploadOpen(true)}>
                  <Upload size={15} />
                  上传
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#b2a6bd]" size={17} />
              <input
                className="field pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索资源名称..."
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a398ae]"
                  onClick={() => setSearch('')}
                  aria-label="清空搜索"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {path.length > 0 && !search && (
              <div className="mt-3 flex flex-wrap items-center gap-1 text-xs font-bold text-[#9b90a7]">
                <button type="button" className="hover:text-sakura-deep" onClick={() => setPath([])}>
                  {selected.label}资源
                </button>
                {path.map((part, index) => (
                  <span key={`${part}-${index}`} className="flex items-center gap-1">
                    <ChevronRight size={12} />
                    <button
                      type="button"
                      className="hover:text-sakura-deep"
                      onClick={() => setPath(path.slice(0, index + 1))}
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="glass-card p-3 md:p-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl bg-white/50 p-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-200/70" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-slate-200/70" />
                      <div className="h-2.5 w-1/3 rounded bg-slate-200/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-5xl">📭</div>
                <p className="mt-3 font-display text-lg font-black text-[#4b4459]">暂无发现的资源</p>
                <p className="mt-1 text-xs font-semibold text-[#9b90a7]">
                  {search ? '换个关键词试试' : '该目录下还没有共享词表'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((folder) => (
                  <button
                    key={folder.name}
                    type="button"
                    onClick={() => setPath(folder.path)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 text-left transition hover:bg-white/85"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lemon/25 text-[#a47d00]">
                      <Folder size={20} />
                    </span>
                    <span className="flex-1 font-display text-base font-black text-[#4b4459]">{folder.name}</span>
                    <ChevronRight size={18} className="text-[#b2a6bd]" />
                  </button>
                ))}

                {files.map((entry) => (
                  <div
                    key={entry.key || entry.downloadUrl}
                    className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 transition hover:bg-white/85 sm:flex-row sm:items-center"
                  >
                    <button
                      type="button"
                      onClick={() => void previewEntry(entry)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                          entry.fileName.toLowerCase().endsWith('.json')
                            ? 'bg-grape/15 text-grape'
                            : 'bg-emerald-100/70 text-emerald-600'
                        }`}
                      >
                        {entry.fileName.toLowerCase().endsWith('.json') ? (
                          <FileJson size={20} />
                        ) : (
                          <FileSpreadsheet size={20} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-black text-[#4b4459]">
                          {entry.fileName}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#a398ae]">
                          {entry.size > 0 && <span>{formatFileSize(entry.size)}</span>}
                          {entry.lastModified && <span>{formatDate(entry.lastModified)}</span>}
                          {search && entry.folderPath && <span>📁 {entry.folderPath}</span>}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5 pl-14 sm:pl-0">
                      <button
                        type="button"
                        className="btn-ghost px-2.5 py-1.5 text-xs"
                        onClick={() => void previewEntry(entry)}
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        className="btn-ghost px-2.5 py-1.5 text-xs"
                        onClick={() => void copyLink(entry)}
                      >
                        复制链接
                      </button>
                      <button
                        type="button"
                        className="icon-btn h-9 w-9"
                        onClick={() => void downloadEntry(entry)}
                        aria-label="下载"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        open={Boolean(preview) || previewLoading}
        title={preview?.title || '正在读取文件…'}
        onClose={() => {
          setPreview(null);
          setPreviewLoading(false);
        }}
        wide
      >
        {previewLoading && !preview ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-[#91869d]">
            <Loader2 size={18} className="animate-spin" />
            正在读取文件…
          </div>
        ) : preview?.rows ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'bg-sakura/10 font-black' : 'odd:bg-white even:bg-slate-50/70'}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="max-w-[180px] whitespace-nowrap px-3 py-2 text-[#5f5872]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
            {preview?.text || '暂无内容'}
          </pre>
        )}
      </Modal>

      <Modal open={uploadOpen} title="共享单词表" onClose={() => setUploadOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black tracking-[0.16em] text-[#9b90a7]">选择语言分类</span>
            <select className="select-field" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.label} / {item.category}
                </option>
              ))}
            </select>
          </label>

          <div
            role="button"
            tabIndex={0}
            onClick={() => uploadRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') uploadRef.current?.click();
            }}
            className="flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed border-[#e7d9e2] bg-white/55 p-7 text-center transition hover:border-sakura/60 hover:bg-white/80"
          >
            <Upload size={26} className="text-sakura-deep" />
            <p className="mt-2 text-sm font-black text-[#4b4459]">
              {uploadFile ? uploadFile.name : '点击选择 .xlsx / .xls / .json / .csv'}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#9b90a7]">上传后会进入资源库等待审核</p>
            <input
              ref={uploadRef}
              type="file"
              accept=".xlsx,.xls,.json,.csv"
              className="hidden"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            />
          </div>

          <button type="button" className="btn-primary w-full" disabled={uploading || !uploadFile} onClick={() => void upload()}>
            {uploading ? <Loader2 size={17} className="animate-spin" /> : <CloudUpload size={17} />}
            {uploading ? '上传中…' : '提交共享'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
