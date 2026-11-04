import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * 本地开发时把 Vercel Edge Functions 直接挂到 Vite dev server。
 * 这样 `npm run dev` 也能使用 /api/*，不需要额外启动 vercel dev。
 */
function localApiPlugin(): Plugin {
  return {
    name: 'xiaomanjici-local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.assign(process.env, env);

      const loaders: Record<string, () => Promise<{ default: (req: Request) => Promise<Response> }>> = {
        '/api/voices': () => import('./api/voices'),
        '/api/synthesize': () => import('./api/synthesize'),
        '/api/word-lists': () => import('./api/word-lists'),
        '/api/download-resource': () => import('./api/download-resource'),
        '/api/upload-word-resource': () => import('./api/upload-word-resource'),
        '/api/ai-search': () => import('./api/ai-search')
      };

      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        const loader = loaders[pathname];
        if (!loader) {
          next();
          return;
        }

        try {
          const { default: handler } = await loader();
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const body = chunks.length ? Buffer.concat(chunks) : undefined;

          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
          });

          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error as Error);
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
