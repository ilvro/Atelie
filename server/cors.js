/**
 * Middleware de CORS somente leitura para o Tabletop (Contrato Seção 5).
 */

export function readOnlyCors(allowedOrigins = []) {
  const allowedSet = new Set(allowedOrigins);

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;

    if (!origin || !allowedSet.has(origin)) {
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      return next();
    }

    // Origin is in the allowed list
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Expose-Headers', 'X-Atelie-Revision');

    if (req.method === 'OPTIONS') {
      const reqMethod = (req.headers['access-control-request-method'] || '').toUpperCase();
      if (reqMethod === 'GET' || reqMethod === 'HEAD' || !reqMethod) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
        const reqHeaders = req.headers['access-control-request-headers'];
        if (reqHeaders) {
          res.setHeader('Access-Control-Allow-Headers', reqHeaders);
        }
        return res.status(204).end();
      }
      return res.status(405).end();
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.removeHeader('Access-Control-Allow-Origin');
      res.removeHeader('Access-Control-Expose-Headers');
    }

    next();
  };
}

