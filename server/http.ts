export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...headers
    }
  });
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function getApiBase() {
  return (process.env.AWS_API_BASE || process.env.API_GATEWAY_URL || '').replace(/\/+$/, '');
}

export function requireApiBase() {
  const base = getApiBase();
  if (!base) {
    throw new HttpError(503, '服务端未配置 AWS_API_BASE');
  }
  return base;
}

export async function upstreamPost(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { response, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(504, '上游接口请求超时');
    }
    throw new HttpError(502, `上游接口请求失败：${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export function safeString(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function handleError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : '服务器内部错误';
  return json({ success: false, error: message }, status);
}
