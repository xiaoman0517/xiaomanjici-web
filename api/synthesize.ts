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

type Body = {
  text?: string;
  voiceId?: string;
  languageCode?: string;
  engine?: string;
  outputFormat?: string;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = await readJson<Body>(request);
    const text = safeString(body.text, 600);
    const voiceId = safeString(body.voiceId, 80);
    const languageCode = safeString(body.languageCode, 40);

    if (!text) throw new HttpError(400, '缺少 text');
    if (!voiceId) throw new HttpError(400, '缺少 voiceId');
    if (!languageCode) throw new HttpError(400, '缺少 languageCode');

    const base = requireApiBase();
    const { response, data } = await upstreamPost(`${base}/synthesize`, {
      text,
      voiceId,
      languageCode,
      engine: body.engine === 'neural' ? 'neural' : 'standard',
      outputFormat: body.outputFormat === 'pcm' ? 'pcm' : 'mp3'
    });

    if (!response.ok) {
      return json(
        { success: false, error: `语音合成接口返回 HTTP ${response.status}`, raw: data },
        response.status
      );
    }

    return json(data, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    return handleError(error);
  }
}
