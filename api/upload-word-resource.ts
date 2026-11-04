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
  fileData?: string;
  fileName?: string;
  category?: string;
  userId?: string;
  description?: string;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = await readJson<Body>(request);
    const fileData = safeString(body.fileData, 8_000_000);
    const fileName = safeString(body.fileName, 200);
    const category = safeString(body.category, 40);

    if (!fileData) throw new HttpError(400, '缺少文件内容');
    if (!fileName) throw new HttpError(400, '缺少文件名');
    if (!category) throw new HttpError(400, '缺少语言分类');
    if (!/\.(xlsx|xls|json|csv)$/i.test(fileName)) {
      throw new HttpError(400, '仅支持 xlsx / xls / json / csv');
    }

    const base = requireApiBase();
    const { response, data } = await upstreamPost(`${base}/upload-word-resource`, {
      fileData,
      fileName,
      category,
      userId: safeString(body.userId, 80) || `web_${Date.now()}`,
      description: safeString(body.description, 300) || 'Web 用户上传的单词资源'
    });

    if (!response.ok) {
      return json(
        { success: false, error: `上传接口返回 HTTP ${response.status}`, raw: data },
        response.status
      );
    }

    return json(data, 200);
  } catch (error) {
    return handleError(error);
  }
}
