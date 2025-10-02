import { verifyAccessToken } from '../utils/jwt.js';
export function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        if (!token)
            return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        const payload = verifyAccessToken(token);
        res.locals.userId = payload.sub;
        res.locals.role = payload.role;
        next();
    }
    catch {
        return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
}
export function requireAdmin(_req, res, next) {
    if (res.locals.role !== 'ADMIN') {
        return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    }
    next();
}
