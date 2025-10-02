import pino from 'pino';

const redact = ['req.headers.authorization', 'req.body.password', 'res.headers.set-cookie'];

export const logger = pino({
  enabled: process.env.NODE_ENV !== 'test',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  redact,
});



