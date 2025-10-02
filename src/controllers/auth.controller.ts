import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import crypto from 'crypto';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: parseRefreshTtlMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'),
  };
}

function parseRefreshTtlMs(ttl: string): number {
  if (ttl.endsWith('d')) return Number(ttl.replace('d', '')) * 24 * 60 * 60 * 1000;
  if (ttl.endsWith('h')) return Number(ttl.replace('h', '')) * 60 * 60 * 1000;
  if (ttl.endsWith('m')) return Number(ttl.replace('m', '')) * 60 * 1000;
  return Number(ttl) || 30 * 24 * 60 * 60 * 1000;
}

export const AuthController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: { message: 'Email and password required', code: 'BAD_REQUEST' } });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } });

    const payload = { sub: user.id, role: user.role } as const;
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + parseRefreshTtlMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'));
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions());
    return res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  },

  refresh: async (req: Request, res: Response) => {
    const raw = req.cookies?.refreshToken as string | undefined;
    if (!raw) return res.status(401).json({ error: { message: 'No refresh token', code: 'UNAUTHORIZED' } });

    let payload;
    try {
      payload = verifyRefreshToken(raw);
    } catch {
      return res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
    }
    const tokenHash = hashToken(raw);
    const existing = await prisma.refreshToken.findFirst({ where: { userId: payload.sub, tokenHash } });
    if (!existing || existing.expiresAt < new Date()) {
      return res.status(401).json({ error: { message: 'Expired or invalid', code: 'UNAUTHORIZED' } });
    }

    await prisma.refreshToken.delete({ where: { id: existing.id } });

    const newAccess = signAccessToken({ sub: payload.sub, role: payload.role });
    const newRefresh = signRefreshToken({ sub: payload.sub, role: payload.role });
    await prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(newRefresh),
        expiresAt: new Date(Date.now() + parseRefreshTtlMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d')),
      },
    });
    res.cookie('refreshToken', newRefresh, refreshCookieOptions());
    return res.json({ accessToken: newAccess });
  },

  logout: async (req: Request, res: Response) => {
    const raw = req.cookies?.refreshToken as string | undefined;
    if (raw) {
      const tokenHash = hashToken(raw);
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    res.clearCookie('refreshToken', { path: '/' });
    return res.status(200).json({ success: true });
  },
};


