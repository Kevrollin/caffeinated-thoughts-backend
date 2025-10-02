import jwt, { SignOptions, Secret, JwtPayload as JwtStdPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  role: 'ADMIN' | 'READER';
};

const accessSecret: Secret = env.jwtAccessSecret as unknown as Secret;
const refreshSecret: Secret = env.jwtRefreshSecret as unknown as Secret;
const baseOptions: SignOptions = { algorithm: 'HS256' };

export function signAccessToken(payload: JwtPayload) {
  const options: SignOptions = { ...baseOptions, expiresIn: env.accessTokenTtl as any };
  return jwt.sign(payload as any, accessSecret, options);
}

export function signRefreshToken(payload: JwtPayload) {
  const options: SignOptions = { ...baseOptions, expiresIn: env.refreshTokenTtl as any };
  return jwt.sign(payload as any, refreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, accessSecret) as JwtStdPayload | string;
  return (decoded as JwtStdPayload) as unknown as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, refreshSecret) as JwtStdPayload | string;
  return (decoded as JwtStdPayload) as unknown as JwtPayload;
}


