import {
  handleError,
  HttpError,
  json,
  optionsResponse,
  readJson,
  requireApiBase,
  safeString,
  upstreamPost
} from '../server/http';

export const config = { runtime: 'edge' };

type Body = { key?: string; s3Key?: string };

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = await readJson<Body>(request);
    const key = safeString(body.key || body.s3Key, 1024);

    if (!key.startsWith('official/')) throw new HttpError(400, '仅允许下载 official/ 前缀的对象');
    if (key.includes('..') || key.includes('//')) throw new HttpError(400, '非法对象键');
    if (!/\.(xlsx|xls|json|csv)$/i.test(key.split('/').pop() || '')) {
      throw new HttpError(400, '仅允许下载词表类型文件');
    }

    const base = requireApiBase();
    const { response, data } = await upstreamPost(`${base}/download-word-resource`, { key });

    if (!response.ok) {
      return json(
        { success: false, error: `下载接口返回 HTTP ${response.status}`, raw: data },
        response.status
      );
    }

    return json(data, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (error) {
    return handleError(error);
  }
}
