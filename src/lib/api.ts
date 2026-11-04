import type { Voice, Word, WordListEntry } from '../types';

async function readError(response: Response) {
  try {
    const data = await response.json();
    return data?.error || data?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as T;
}

export async function fetchVoices(): Promise<Voice[]> {
  const data = await postJson<{ Voices?: Voice[]; voices?: Voice[] }>('/api/voices', {});
  const voices = data.Voices || data.voices || [];
  if (!Array.isArray(voices) || voices.length === 0) {
    throw new Error('音色列表为空');
  }
  return voices.filter((voice) => voice?.Id && voice?.LanguageCode);
}

export async function aiSearch(query: string, languageName: string, languageCode: string) {
  const data = await postJson<{ results: Word[] }>('/api/ai-search', {
    query,
    languageName,
    languageCode
  });
  return (data.results || []).map((item, index) => ({
    id: `ai-${Date.now()}-${index}`,
    word: item.word || '',
    phonetic: item.phonetic || '',
    definition: item.definition || '',
    example: item.example || '',
    exampleTranslation: item.exampleTranslation || ''
  }));
}

function normalizeItems(data: unknown): WordListEntry[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as WordListEntry[];
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as WordListEntry[];
    if (Array.isArray(obj.wordLists)) return obj.wordLists as WordListEntry[];
  }
  return [];
}

function pickToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const nested =
    obj.data && typeof obj.data === 'object'
      ? (obj.data as Record<string, unknown>)
      : null;
  return (
    (nested?.nextContinuationToken as string) ||
    (nested?.nextToken as string) ||
    (nested?.continuationToken as string) ||
    (obj.nextContinuationToken as string) ||
    (obj.nextToken as string) ||
    (obj.NextContinuationToken as string) ||
    null
  );
}

export async function fetchAllWordLists(
  category: string,
  onProgress?: (items: WordListEntry[]) => void
): Promise<WordListEntry[]> {
  const merged: WordListEntry[] = [];
  const seen = new Set<string>();
  let token: string | null = null;
  let pages = 0;

  while (pages < 100) {
    pages += 1;
    const response: Record<string, unknown> = await postJson<Record<string, unknown>>('/api/word-lists', {
      category,
      ...(token ? { continuationToken: token } : {})
    });
    const raw = (response.data ?? response) as unknown;
    const items = normalizeItems(raw);
    items.forEach((item) => {
      const key =
        item.s3Key ||
        item.key ||
        `${item.fileName || ''}_${item.category || ''}_${item.lastModified || ''}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    onProgress?.([...merged]);
    const next: string | null = pickToken(response) || pickToken(raw);
    if (!next) break;
    token = next;
  }

  return merged;
}

export async function downloadResource(key: string, downloadUrl?: string) {
  return postJson<{
    success: boolean;
    data: string;
    fileName: string;
    contentType?: string;
    size?: number;
    source?: string;
  }>('/api/download-resource', { key, downloadUrl });
}

export async function uploadResource(payload: {
  fileData: string;
  fileName: string;
  category: string;
  description?: string;
}) {
  return postJson<{ success: boolean }>('/api/upload-word-resource', payload);
}
