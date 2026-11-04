import type { Word, WordListEntry } from '../types';
import { downloadResource } from './api';
import { parseCsv, parseJsonWords, parseWorkbook } from './parseWords';
import { base64ToBytes } from './utils';

export async function parseWordListResource(entry: WordListEntry): Promise<Word[]> {
  const key = entry.s3Key || entry.key || '';
  if (!key) throw new Error('该词表缺少可下载的对象键');

  const data = await downloadResource(key, entry.downloadUrl);
  if (!data.data) throw new Error('下载接口没有返回文件内容');

  const bytes = base64ToBytes(data.data);
  const fileName = data.fileName || entry.fileName || '';

  if (fileName.toLowerCase().endsWith('.json')) {
    const text = new TextDecoder().decode(bytes);
    const words = parseJsonWords(JSON.parse(text));
    if (words.length === 0) throw new Error('JSON 词表中没有有效单词');
    return words;
  }

  if (fileName.toLowerCase().endsWith('.csv')) {
    return parseCsv(new TextDecoder().decode(bytes));
  }

  return parseWorkbook(bytes.buffer as ArrayBuffer);
}
