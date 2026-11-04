import { handleError, json, optionsResponse, requireApiBase, upstreamPost } from '../server/http';

export const config = { runtime: 'edge' };

let cache: { at: number; data: unknown } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    if (cache && Date.now() - cache.at < CACHE_TTL) {
      return json(cache.data, 200, { 'Cache-Control': 'public, max-age=600' });
    }

    const base = requireApiBase();
    const { response, data } = await upstreamPost(`${base}/voices`, {});
    if (!response.ok) {
      return json(
        { success: false, error: `音色接口返回 HTTP ${response.status}`, raw: data },
        response.status
      );
    }

    cache = { at: Date.now(), data };
    return json(data, 200, { 'Cache-Control': 'public, max-age=600' });
  } catch (error) {
    return handleError(error);
  }
}
