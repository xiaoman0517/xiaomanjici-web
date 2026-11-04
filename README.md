# 小满记词 · Web 版

基于小程序业务逻辑重写的多语言单词学习与听写测验 Web 应用。

- 前端：Vite + React + TypeScript + Tailwind CSS + Framer Motion + Zustand
- 部署：Vercel（静态 SPA + `/api` Edge Functions）
- 后端：Vercel Edge Functions 代理现有 AWS API Gateway / DeepSeek

## 快速开始

```bash
cd web
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 AWS_API_BASE 和 DEEPSEEK_API_KEY
npm run dev
```

打开 http://localhost:5173 。

本地开发时，`vite.config.ts` 会把 `/api/*` 直接挂到 Vite dev server，所以 `npm run dev` 就能跑完整前后端，不需要额外启动 `vercel dev`。

## 环境变量

| 变量 | 说明 | 必需 |
| --- | --- | --- |
| `AWS_API_BASE` | AWS API Gateway 地址，例如 `https://xxx.execute-api.us-east-1.amazonaws.com/dev` | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，只在服务端使用 | AI 查词需要 |
| `DEEPSEEK_MODEL` | DeepSeek 模型，默认 `deepseek-chat` | 否 |

> 安全提示：`DEEPSEEK_API_KEY` 不要加 `VITE_` 前缀，不要写进任何前端代码或提交到仓库。仓库里的小程序源码曾出现硬编码 Key，请务必轮换。

## 部署到 Vercel

1. 新建独立 GitHub 仓库，只提交 `web/` 的内容（不要把小程序目录提交进去）。
2. Vercel → New Project → 选择该仓库。
3. Framework Preset：Vite
4. Build Command：`npm run build`
5. Output Directory：`dist`
6. 在 Vercel 项目 Settings → Environment Variables 配置上面的变量。
7. 部署完成后绑定域名。

`vercel.json` 已配置 SPA rewrite；`/api/*` 会自动作为 Edge Functions 部署。

## 功能

- 学习页
  - 本地文件 / URL 导入 `.xlsx/.xls/.csv/.json`
  - AI 查词并加入词表
  - 单词卡片、发音、例句发音
  - 自动播放（单词 / 单词+例句）、随机、1–10 秒间隔
  - 标记已掌握、进度、语言/音色切换
- 测验页
  - `testing → review → retest → complete` 状态机
  - 随机出题、错词延迟复现（`wait: 2`）
  - 认识 / 不认识、查看答案、错词回顾轮播、只重测错词
  - 导出错词 Excel
- 发现页
  - 语言分类、S3 词表分页、目录层级、搜索
  - 预览 xlsx / json、下载、复制链接
  - 上传共享词表
- 我的页
  - 搜索历史、删除、导出、清空
  - 语言与音色设置
  - 本地数据清理

## 数据存储

- 使用 `localStorage` 持久化词表、设置、历史和测验状态。
- 数据只保存在当前浏览器；清理浏览器数据会丢失。
- 若词表特别大，建议后续替换为 IndexedDB。

## 目录结构

```
web/
├─ api/                 # Vercel Edge Functions
│  ├─ ai-search.ts
│  ├─ voices.ts
│  ├─ synthesize.ts
│  ├─ word-lists.ts
│  ├─ download-resource.ts
│  └─ upload-word-resource.ts
├─ server/              # API 共用工具
├─ src/
│  ├─ components/
│  ├─ data/
│  ├─ lib/
│  ├─ pages/
│  └─ store/
├─ vite.config.ts
├─ vercel.json
└─ package.json
```

## 说明

- 当前 AWS `/voices`、`/synthesize`、`/upload-word-resource` 的 Lambda 源码不在小程序仓库中，Web 端按现有调用协议做代理。
- 若接口返回格式变化，只需调整 `api/*` 和 `src/lib/api.ts`。
- TTS 失败时会自动回退到浏览器 `speechSynthesis`。
