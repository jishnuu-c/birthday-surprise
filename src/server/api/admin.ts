import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAdminDashboardData, createAdminFreeSurprise, verifyAdminSession } from '../paymentHandlers';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  method?: string;
}

interface ExtendedResponse extends ServerResponse {
  status: (code: number) => ExtendedResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const authHeader = req.headers.authorization;

  if (req.method === 'GET') {
    const data = await getAdminDashboardData(authHeader);
    res.statusCode = data.authorized ? 200 : (data.error?.includes('not authorized') ? 403 : 401);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      } else if (!body) {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const dataStr = Buffer.concat(buffers).toString();
        body = dataStr ? JSON.parse(dataStr) : {};
      }

      const { action, recipientName, config } = body || {};

      if (action === 'verify') {
        const verifyResult = await verifyAdminSession(authHeader);
        res.statusCode = verifyResult.authorized ? 200 : (verifyResult.error?.includes('not authorized') ? 403 : 401);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(verifyResult));
        return;
      }

      if (action === 'create_free') {
        const result = await createAdminFreeSurprise(authHeader || null, {
          recipientName: recipientName || 'Guest of Honor',
          config: config || {}
        });
        if (result.success) {
          res.statusCode = 200;
        } else if (result.error?.includes('not authorized') || result.error?.includes('Access denied')) {
          res.statusCode = 403;
        } else if (result.error?.includes('Missing') || result.error?.includes('token') || result.error?.includes('Unauthorized') || result.error?.includes('JWT')) {
          res.statusCode = 401;
        } else {
          res.statusCode = 500;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      }

      if (action === 'get_dashboard_data') {
        const data = await getAdminDashboardData(authHeader);
        res.statusCode = data.authorized ? 200 : (data.error?.includes('not authorized') ? 403 : 401);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return;
      }

      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Unknown admin action: ${action}` }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal Server Error';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: msg }));
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
