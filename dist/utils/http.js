import { randomUUID } from 'crypto';
export function requestId() {
    return function reqId(_req, res, next) {
        res.locals.requestId = randomUUID();
        res.setHeader('X-Request-Id', res.locals.requestId);
        next();
    };
}
export function notFoundHandler(_req, res) {
    res.status(404).json({ error: { message: 'Not Found', code: 'NOT_FOUND' } });
}
export function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'Internal Server Error';
    const details = err.details;
    res.status(status).json({ error: { message, code, details } });
}
