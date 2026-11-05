import type { Word } from '../types';
import { uid } from './utils';

type Field = keyof Omit<Word, 'id'>;
export type FirstRowMode = 'auto' | 'header' | 'data';
export interface ParseOptions {
  firstRowMode?: FirstRowMode;
}

const FIELDS: Field[] = ['word', 'phonetic', 'definition', 'example', 'exampleTranslation'];

/**
 * 只用于两件事：
 * 1. 判断第一行是不是表头；
 * 2. 解析 JSON 对象时匹配字段名。
 *
 * 表格类文件（xlsx/xls/csv）不按列名重排，永远按第 1~5 列读取，
 * 这样列名可以随便写，只要顺序是：
 * 单词、音标、释义、例句、例句翻译。
 */
const HEADER_ALIASES: Record<Field, string[]> = {
  word: [
    'word',
    'words',
    'term',
    'spelling',
    'vocabulary',
    'expression',
    'phrase',
    'english',
    'headword',
    'lemma',
    '单词',
    '词汇',
    '词条',
    '词',
    '英文',
    '英文单词',
    '外文',
    '目标词',
    '短语'
  ],
  phonetic: [
    'phonetic',
    'phonetics',
    'pronunciation',
    'pronounce',
    'ipa',
    'reading',
    '音标',
    '发音',
    '读音',
    '注音',
    '拼音',
    '罗马音'
  ],
  definition: [
    'definition',
    'meaning',
    'gloss',
    'explanation',
    'translation',
    'chinese',
    'explanation',
    '释义',
    '词义',
    '含义',
    '意思',
    '解释',
    '中文',
    '中文释义',
    '中文意思',
    '翻译'
  ],
  example: [
    'example',
    'examples',
    'sentence',
    'sample',
    'usage',
    '例句',
    '句子',
    '示例',
    '用例'
  ],
  exampleTranslation: [
    'exampletranslation',
    'example translation',
    'translation',
    'chinese translation',
    'sentence translation',
    'example sentence translation',
    '例句翻译',
    '例句中文',
    '例句译文',
    '译文',
    '中文翻译',
    '翻译'
  ]
};

const ALL_HEADER_KEYS = Array.from(
  new Set(Object.values(HEADER_ALIASES).flat().map((value) => normalizeKey(value)))
);

function normalizeKey(value: string) {
  return String(value)
    .replace(/^\uFEFF/, '')
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|【[^】]*】/g, '')
    .toLowerCase()
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, '')
    .replace(/[\s_\-—–:：/\\|,，.。;；、"'“”‘’]/g, '');
}

function headerCandidates(value: unknown) {
  const raw = String(value ?? '');
  const parts = raw.split(/[\/|｜]/).map(normalizeKey).filter(Boolean);
  return [normalizeKey(raw), ...parts];
}

function hasHeaderAlias(value: unknown) {
  return headerCandidates(value).some((candidate) => ALL_HEADER_KEYS.includes(candidate));
}

function looksLikePhonetic(value: unknown) {
  const text = String(value ?? '');
  return /[\/\[\]ˈˌːəɪʊɔæɑɜθðʃʒŋɲɴʎɹɾɦʔ]/.test(text);
}

function looksLikeSentence(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 48 || text.split(/\s+/).filter(Boolean).length >= 6;
}

function isHeaderRow(row: unknown[]) {
  const nonEmptyCells = row.filter((cell) => String(cell ?? '').trim() !== '');
  if (nonEmptyCells.length === 0) return false;

  const matched = nonEmptyCells.filter(hasHeaderAlias).length;
  if (matched >= 1) {
    // 防止把首行真实单词误判成表头：
    // 例如首词恰好是 "word"，同时释义是 "单词"，但音标/例句明显是真实内容。
    const dataSignals =
      row.slice(1, 2).some(looksLikePhonetic) || row.slice(3).some(looksLikeSentence);
    if (!dataSignals) return true;
  }

  // 列名完全不在别名表里时，用“短标签”特征做一个兜底判断。
  const normalized = nonEmptyCells.map((cell) => normalizeKey(String(cell)));
  const semantic = normalized.some((cell) =>
    /(词|word|音|phon|义|mean|def|例|sent|译|trans|ipa|pron|read)/i.test(cell)
  );
  return (
    normalized.length >= 3 &&
    normalized.every((cell) => cell.length > 0 && cell.length <= 16) &&
    semantic &&
    !row.slice(1, 2).some(looksLikePhonetic) &&
    !row.slice(3).some(looksLikeSentence)
  );
}

function makeWord(
  wordValue: unknown,
  phoneticValue: unknown = '',
  definitionValue: unknown = '',
  exampleValue: unknown = '',
  exampleTranslationValue: unknown = ''
): Word | null {
  const word = String(wordValue ?? '').trim();
  if (!word) return null;
  return {
    id: uid(),
    word,
    phonetic: String(phoneticValue ?? '').trim(),
    definition: String(definitionValue ?? '').trim(),
    example: String(exampleValue ?? '').trim(),
    exampleTranslation: String(exampleTranslationValue ?? '').trim()
  };
}

function rowToWord(row: unknown[]): Word | null {
  return makeWord(row[0], row[1], row[2], row[3], row[4]);
}

function pickValue(record: Record<string, unknown>, field: Field) {
  const keys = HEADER_ALIASES[field].map(normalizeKey);
  for (const [key, value] of Object.entries(record)) {
    const candidates = headerCandidates(key);
    if (candidates.some((candidate) => keys.includes(candidate))) {
      return value == null ? '' : String(value).trim();
    }
  }
  return '';
}

export function normalizeWordItem(raw: Record<string, unknown>): Word | null {
  let word = pickValue(raw, 'word');
  let phonetic = pickValue(raw, 'phonetic');
  let definition = pickValue(raw, 'definition');
  let example = pickValue(raw, 'example');
  let exampleTranslation = pickValue(raw, 'exampleTranslation');

  // 兼容完全没有列名、但字段顺序是 5 列的 JSON 对象
  if (!word) {
    const values = Object.values(raw);
    if (values.length >= 5 && values[0] != null && String(values[0]).trim()) {
      word = String(values[0]);
      phonetic = phonetic || String(values[1] ?? '');
      definition = definition || String(values[2] ?? '');
      example = example || String(values[3] ?? '');
      exampleTranslation = exampleTranslation || String(values[4] ?? '');
    }
  }

  if (!word) return null;
  return makeWord(word, phonetic, definition, example, exampleTranslation);
}

function rowsToWords(rows: unknown[][], options: ParseOptions = {}): Word[] {
  const nonEmpty = rows.filter((row) =>
    row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')
  );
  if (nonEmpty.length === 0) return [];

  const header =
    options.firstRowMode === 'header'
      ? true
      : options.firstRowMode === 'data'
        ? false
        : isHeaderRow(nonEmpty[0]);
  const dataRows = header ? nonEmpty.slice(1) : nonEmpty;

  // 关键：不按列名重排，只按第 1~5 列顺序读取。
  return dataRows.map(rowToWord).filter((item): item is Word => Boolean(item));
}

function jsonItemToWord(item: unknown): Word | null {
  if (Array.isArray(item)) return rowToWord(item);
  if (typeof item === 'string') return makeWord(item);
  if (item && typeof item === 'object') return normalizeWordItem(item as Record<string, unknown>);
  return null;
}

export function parseJsonWords(raw: unknown, options: ParseOptions = {}): Word[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.words)) list = obj.words;
    else if (Array.isArray(obj.results)) list = obj.results;
    else if (Array.isArray(obj.data)) list = obj.data;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.list)) list = obj.list;
    else if (Array.isArray(obj.rows)) list = obj.rows;
    else if (obj.word) list = [obj];
  }

  // JSON 二维数组：与 Excel/CSV 一样，首行自动识别表头，之后按 5 列顺序读取
  if (list.length > 0 && list.every((item) => Array.isArray(item))) {
    return rowsToWords(list as unknown[][], options);
  }

  return list.map(jsonItemToWord).filter((item): item is Word => Boolean(item));
}

export async function parseWorkbook(buffer: ArrayBuffer, options: ParseOptions = {}): Promise<Word[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('文件中没有工作表');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const words = rowsToWords(rows, options);
  if (words.length === 0) throw new Error('没有解析到有效单词，请检查表格是否至少有 5 列');
  return words;
}

export async function parseCsv(text: string, options: ParseOptions = {}): Promise<Word[]> {
  const XLSX = await import('xlsx');
  // CSV 必须按字符串读入，否则中文表头会被按 ANSI 解码成乱码
  const workbook = XLSX.read(text, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('CSV 中没有有效内容');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  });
  const words = rowsToWords(rows, options);
  if (words.length === 0) throw new Error('没有解析到有效单词，请检查表格是否至少有 5 列');
  return words;
}

export async function parseWordFile(file: File, options: ParseOptions = {}): Promise<Word[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json')) {
    const text = await file.text();
    const words = parseJsonWords(JSON.parse(text), options);
    if (words.length === 0) throw new Error('JSON 中没有有效单词');
    return words;
  }
  if (lower.endsWith('.csv')) {
    return await parseCsv(await file.text(), options);
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return await parseWorkbook(await file.arrayBuffer(), options);
  }
  throw new Error('仅支持 .xlsx / .xls / .csv / .json 文件');
}

export async function parseWordUrl(url: string, options: ParseOptions = {}): Promise<Word[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.json')) {
    const words = parseJsonWords(await response.json(), options);
    if (words.length === 0) throw new Error('JSON 中没有有效单词');
    return words;
  }
  if (lower.endsWith('.csv')) {
    return await parseCsv(await response.text(), options);
  }
  return await parseWorkbook(await response.arrayBuffer(), options);
}

export function fileNameFromUrl(url: string) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return name || 'wordlist.xlsx';
  } catch {
    return 'wordlist.xlsx';
  }
}
