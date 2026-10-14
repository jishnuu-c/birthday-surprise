import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        res.setHeader('Content-Type', 'application/json');

        let body: any = {};
        if (req.method === 'POST' || req.method === 'PUT') {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const text = Buffer.concat(buffers).toString('utf8');
          try {
            body = text ? JSON.parse(text) : {};
          } catch {
            body = {};
          }
        }

        try {
          if (pathname === '/api/create-order') {
            const { createRazorpayOrder } = await import('./src/server/paymentHandlers.ts');
            const result = await createRazorpayOrder(body);
            res.statusCode = result.success ? 200 : 400;
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/verify-payment') {
            const { verifyRazorpayPayment } = await import('./src/server/paymentHandlers.ts');
            const result = await verifyRazorpayPayment(body);
            res.statusCode = result.success ? 200 : 400;
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/verify-token') {
            const { verifyEditToken } = await import('./src/server/paymentHandlers.ts');
            const authHeader = req.headers.authorization;
            const result = await verifyEditToken(body.surpriseId, body.token, authHeader);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/save-surprise') {
            const { saveSurpriseWithToken } = await import('./src/server/paymentHandlers.ts');
            const authHeader = req.headers.authorization;
            const result = await saveSurpriseWithToken({
              id: body.id,
              token: body.token,
              adminAuthHeader: authHeader,
              config: body.config || {},
              isPublished: body.isPublished
            });
            res.statusCode = result.success ? 200 : (result.error?.includes('Unauthorized') ? 401 : 400);
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/admin') {
            const { getAdminDashboardData, createAdminFreeSurprise, verifyAdminSession } = await import('./src/server/paymentHandlers.ts');
            const authHeader = req.headers.authorization;

            if (body.action === 'verify') {
              const verifyResult = await verifyAdminSession(authHeader);
              res.statusCode = verifyResult.authorized ? 200 : 401;
              res.end(JSON.stringify(verifyResult));
              return;
            }

            if (req.method === 'GET' || body.action === 'get_dashboard_data') {
              const result = await getAdminDashboardData(authHeader);
              res.statusCode = result.authorized ? 200 : 401;
              res.end(JSON.stringify(result));
              return;
            }
            if (body.action === 'create_free') {
              const result = await createAdminFreeSurprise(authHeader || null, {
                recipientName: body.recipientName || 'Guest of Honor',
                config: body.config || {}
              });
              res.statusCode = result.success ? 200 : 401;
              res.end(JSON.stringify(result));
              return;
            }
          }

          next();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Dev API error';
          res.statusCode = 500;
          res.end(JSON.stringify({ error: msg }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }
              if (id.includes('canvas-confetti')) {
                return 'canvas-confetti';
              }
              if (id.includes('qrcode.react')) {
                return 'qrcode';
              }
              if (id.includes('lucide-react')) {
                return 'lucide-icons';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'react-vendor';
              }
            }
          }
        }
      }
    }
  };
});

