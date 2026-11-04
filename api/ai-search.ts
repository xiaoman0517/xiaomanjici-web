import {
  handleError,
  HttpError,
  json,
  optionsResponse,
  readJson,
  safeString
} from '../server/http';

export const config = { runtime: 'edge' };

type Body = {
  query?: string;
  languageName?: string;
  languageCode?: string;
};

type AiResult = {
  word?: string;
  phonetic?: string;
  definition?: string;
  example?: string;
  exampleTranslation?: string;
  langCode?: string;
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (bucket.count >= 20) {
    throw new HttpError(429, '请求过于频繁，请稍后再试');
  }
  bucket.count += 1;
}

function buildPrompt(languageName: string, languageCode: string) {
  return `你是一个专业的多语言词典与学习助手。你必须只输出一个合法的 JSON 对象（不要 Markdown 代码块、不要前后说明文字），结构如下：
{
  "results": [
    {
      "word": "目标外语单词或短语",
      "phonetic": "该语种常用音标或注音（与 word 语种一致；无则可为空字符串）",
      "definition": "简体中文释义（可含词性，如 n. …）",
      "example": "与 word 同语种的例句（不得用中文写例句）",
      "exampleTranslation": "对 example 的简体中文翻译",
      "langCode": "与 word 语种一致的 BCP-47 代码（如 fr-FR、en-US）"
    }
  ]
}

【应用内默认学习语言】用户当前在应用中设置的默认（目标）学习语言为：${languageName}（${languageCode}）。

【语种与词条规则】
1. 若用户在请求中没有明确要求改学、列举或翻译到「另一种」具体外语（例如未出现与「${languageName}」明显不同的语种名，如日语、法语、俄语等），则所有条目的 word、example 必须使用上述默认学习语言书写；langCode 应使用 ${languageCode} 或与该语种一致的标准 BCP-47 代码。
2. 若用户明确指定了与默认不同的外语（如「给我五个德语单词」），则 word、example、langCode 以用户指定的外语为准。
3. 若用户用中文输入概念、主题或中文词（如「苹果」「与环保相关的词」），应在默认学习语言中输出对应的地道单词或短语列表；word 字段不得使用中文（除非默认学习语言本身就是中文且用户意图是查中文词）。
4. 若用户输入的主要是当前默认学习语言中的单词或短语（或该语种的字母/字符），则视为查词：word 保持为该外文形式，并补全音标、释义、例句等完整卡片信息。

【中文辅助字段（强制）】
- definition 必须为简体中文。
- exampleTranslation 必须为简体中文，且准确对应 example。
- example 必须与 word 同一外语。`;
}

function normalizeResults(raw: unknown): AiResult[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.results)) list = obj.results;
    else if (Array.isArray(obj.words)) list = obj.words;
    else if (obj.word) list = [obj];
  }

  return list
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      word: safeString(item.word, 160),
      phonetic: safeString(item.phonetic, 160),
      definition: safeString(item.definition, 600),
      example: safeString(item.example, 500),
      exampleTranslation: safeString(item.exampleTranslation, 500),
      langCode: safeString(item.langCode, 40)
    }))
    .filter((item) => item.word)
    .slice(0, 12);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    checkRateLimit(request);

    const body = await readJson<Body>(request);
    const query = safeString(body.query, 500);
    const languageName = safeString(body.languageName, 80) || '英语（美国）';
    const languageCode = safeString(body.languageCode, 40) || 'en-US';

    if (!query) throw new HttpError(400, '请输入要查询的单词或主题');

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new HttpError(503, 'AI 服务未配置 DEEPSEEK_API_KEY');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    let upstream: Response;
    try {
      upstream = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: buildPrompt(languageName, languageCode) },
            { role: 'user', content: `请根据下列用户请求生成词典条目（可多词条）：\n${query}` }
          ],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError(504, 'AI 服务响应超时，请稍后重试');
      }
      throw new HttpError(502, '无法连接 AI 服务');
    } finally {
      clearTimeout(timer);
    }

    if (upstream.status === 401) throw new HttpError(502, 'AI 服务认证失败，请检查 DEEPSEEK_API_KEY');
    if (upstream.status === 402) throw new HttpError(503, 'AI 服务账户余额不足');
    if (upstream.status === 429) throw new HttpError(429, 'AI 服务请求过于频繁，请稍后再试');
    if (!upstream.ok) throw new HttpError(502, `AI 服务返回 HTTP ${upstream.status}`);

    const payload = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new HttpError(502, 'AI 返回内容为空');

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new HttpError(502, 'AI 返回内容不是合法 JSON');
    }

    const results = normalizeResults(parsed);
    if (results.length === 0) throw new HttpError(422, 'AI 没有识别到有效单词，请换个问法');

    return json({ success: true, results }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return handleError(error);
  }
}
