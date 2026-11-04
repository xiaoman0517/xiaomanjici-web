import {
  bytesToBase64,
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

type Body = { key?: string; s3Key?: string; downloadUrl?: string };

function validateS3Url(raw: string, key: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'downloadUrl 不是合法 URL');
  }

  if (url.protocol !== 'https:') throw new HttpError(400, 'downloadUrl 必须使用 HTTPS');

  const host = url.hostname.toLowerCase();
  const isS3Host = /(^|\.)s3([.-][a-z0-9-]+)*\.amazonaws\.com$/.test(host);
  if (!isS3Host) throw new HttpError(400, 'downloadUrl 不是允许的 S3 地址');

  const objectKey = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (objectKey !== key) throw new HttpError(400, 'downloadUrl 与对象键不匹配');

  return url;
}

async function downloadDirectFromS3(url: URL, key: string) {
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: '*/*' }
  });
  if (!response.ok) {
    throw new HttpError(502, `S3 直连下载失败：HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > 20 * 1024 * 1024) {
    throw new HttpError(413, '词表文件过大，暂不支持在线导入');
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 20 * 1024 * 1024) {
    throw new HttpError(413, '词表文件过大，暂不支持在线导入');
  }

  return {
    success: true,
    data: bytesToBase64(new Uint8Array(buffer)),
    fileName: key.split('/').pop() || 'wordlist.xlsx',
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    size: buffer.byteLength,
    source: 's3-direct'
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = await readJson<Body>(request);
    const key = safeString(body.key || body.s3Key, 1024);
    const downloadUrl = safeString(body.downloadUrl, 2048);

    if (!key.startsWith('official/')) throw new HttpError(400, '仅允许下载 official/ 前缀的对象');
    if (key.includes('..') || key.includes('//')) throw new HttpError(400, '非法对象键');
    if (!/\.(xlsx|xls|json|csv)$/i.test(key.split('/').pop() || '')) {
      throw new HttpError(400, '仅允许下载词表类型文件');
    }

    let upstreamResponse: Response | null = null;
    let upstreamData: unknown = null;
    let upstreamError: unknown = null;

    try {
      const base = requireApiBase();
      const result = await upstreamPost(`${base}/download-word-resource`, { key });
      upstreamResponse = result.response;
      upstreamData = result.data;
    } catch (error) {
      upstreamError = error;
    }

    if (upstreamResponse?.ok) {
      return json(upstreamData, 200, { 'Cache-Control': 'public, max-age=300' });
    }

    // 兼容 API Gateway 未部署 download-word-resource / 被 403 拦截的情况：
    // 如果词表列表提供了公开 S3 链接，由 Vercel 服务端直接取对象，浏览器仍然同源访问。
    if (downloadUrl) {
      try {
        const objectUrl = validateS3Url(downloadUrl, key);
        const direct = await downloadDirectFromS3(objectUrl, key);
        return json(direct, 200, { 'Cache-Control': 'public, max-age=300' });
      } catch (fallbackError) {
        console.warn('S3 直连兜底失败：', fallbackError);
      }
    }

    if (upstreamError) return handleError(upstreamError);

    const status = upstreamResponse?.status || 502;
    return json(
      {
        success: false,
        error: `下载接口返回 HTTP ${status}`,
        hint: '请检查 API Gateway 的 /download-word-resource 路由，或确认词表 downloadUrl 可公开读取',
        raw: upstreamData
      },
      status
    );
  } catch (error) {
    return handleError(error);
  }
}
