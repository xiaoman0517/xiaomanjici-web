import type { Word } from '../types';
import { uid } from './utils';

const HEADER_ALIASES: Record<keyof Omit<Word, 'id'>, string[]> = {
  word: ['word', '单词', '词汇', 'term', 'spelling'],
  phonetic: ['phonetic', '音标', 'pronunciation', 'ipa', '注音'],
  definition: ['definition', '释义', 'meaning', '翻译', '中文释义', '解释'],
  example: ['example', '例句', 'sentence', 'example sentence'],
  exampleTranslation: [
    'exampletranslation',
    'example translation',
    '例句翻译',
    '例句中文',
    'translation',
    '中文翻译'
  ]
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[\s_\-（）()]/g, '');
}

function pickValue(record: Record<string, unknown>, field: keyof Omit<Word, 'id'>) {
  const keys = HEADER_ALIASES[field].map(normalizeKey);
  for (const [key, value] of Object.entries(record)) {
    if (keys.includes(normalizeKey(key))) {
      return value == null ? '' : String(value).trim();
    }
  }
  return '';
}

export function normalizeWordItem(raw: Record<string, unknown>): Word | null {
  const word =
    pickValue(raw, 'word') ||
    String(raw.word || raw.单词 || raw.term || raw.text || '').trim();
  if (!word) return null;

  return {
    id: uid(),
    word,
    phonetic: pickValue(raw, 'phonetic'),
    definition: pickValue(raw, 'definition'),
    example: pickValue(raw, 'example'),
    exampleTranslation: pickValue(raw, 'exampleTranslation')
  };
}

function rowsToWords(rows: unknown[][]): Word[] {
  const nonEmpty = rows.filter((row) =>
    row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')
  );
  if (nonEmpty.length === 0) return [];

  const headerRow = nonEmpty[0].map((cell) => normalizeKey(String(cell ?? '')));
  const knownHeaders = Object.values(HEADER_ALIASES)
    .flat()
    .map(normalizeKey);
  const hasHeader = headerRow.some((cell) => knownHeaders.includes(cell));

  if (hasHeader) {
    const indexes: Record<string, number> = {};
    (Object.keys(HEADER_ALIASES) as Array<keyof Omit<Word, 'id'>>).forEach((field) => {
      const aliases = HEADER_ALIASES[field].map(normalizeKey);
      indexes[field] = headerRow.findIndex((cell) => aliases.includes(cell));
    });

    return nonEmpty
      .slice(1)
      .map((row) => {
        const value = (field: keyof Omit<Word, 'id'>) =>
          indexes[field] >= 0 ? String(row[indexes[field]] ?? '').trim() : '';
        const word = value('word');
        if (!word) return null;
        return {
          id: uid(),
          word,
          phonetic: value('phonetic'),
          definition: value('definition'),
          example: value('example'),
          exampleTranslation: value('exampleTranslation')
        } satisfies Word;
      })
      .filter((item): item is Word => Boolean(item));
  }

  return nonEmpty
    .map((row) => {
      const [word = '', phonetic = '', definition = '', example = '', exampleTranslation = ''] = row;
      if (!String(word).trim()) return null;
      return {
        id: uid(),
        word: String(word).trim(),
        phonetic: String(phonetic).trim(),
        definition: String(definition).trim(),
        example: String(example).trim(),
        exampleTranslation: String(exampleTranslation).trim()
      } satisfies Word;
    })
    .filter((item): item is Word => Boolean(item));
}

export function parseJsonWords(raw: unknown): Word[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.words)) list = obj.words;
    else if (Array.isArray(obj.results)) list = obj.results;
    else if (Array.isArray(obj.data)) list = obj.data;
    else if (obj.word) list = [obj];
  }

  return list
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(normalizeWordItem)
    .filter((item): item is Word => Boolean(item));
}

export async function parseWorkbook(buffer: ArrayBuffer): Promise<Word[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('文件中没有工作表');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const words = rowsToWords(rows);
  if (words.length === 0) throw new Error('没有解析到有效单词，请检查表格列顺序');
  return words;
}

export async function parseWordFile(file: File): Promise<Word[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json')) {
    const text = await file.text();
    const words = parseJsonWords(JSON.parse(text));
    if (words.length === 0) throw new Error('JSON 中没有有效单词');
    return words;
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
    return await parseWorkbook(await file.arrayBuffer());
  }
  throw new Error('仅支持 .xlsx / .xls / .csv / .json 文件');
}

export async function parseWordUrl(url: string): Promise<Word[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.json')) {
    const words = parseJsonWords(await response.json());
    if (words.length === 0) throw new Error('JSON 中没有有效单词');
    return words;
  }
  return await parseWorkbook(await response.arrayBuffer());
}

export function fileNameFromUrl(url: string) {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return name || 'wordlist.xlsx';
  } catch {
    return 'wordlist.xlsx';
  }
}
