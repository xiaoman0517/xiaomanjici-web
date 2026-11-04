import {
  handleError,
  json,
  optionsResponse,
  readJson,
  requireApiBase,
  safeString,
  upstreamPost
} from '../server/http';

export const config = { runtime: 'edge' };

type Body = {
  category?: string;
  continuationToken?: string;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = await readJson<Body>(request);
    const category = safeString(body.category, 40);
    const continuationToken = safeString(body.continuationToken, 2048);

    const base = requireApiBase();
    const { response, data } = await upstreamPost(`${base}/get-word-lists`, {
      category,
      ...(continuationToken ? { continuationToken } : {})
    });

    if (!response.ok) {
      return json(
        { success: false, error: `词表接口返回 HTTP ${response.status}`, raw: data },
        response.status
      );
    }

    return json(data, 200, { 'Cache-Control': 'public, max-age=120' });
  } catch (error) {
    return handleError(error);
  }
}
