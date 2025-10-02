import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
const accessSecret = env.jwtAccessSecret;
const refreshSecret = env.jwtRefreshSecret;
const baseOptions = { algorithm: 'HS256' };
export function signAccessToken(payload) {
    const options = { ...baseOptions, expiresIn: env.accessTokenTtl };
    return jwt.sign(payload, accessSecret, options);
}
export function signRefreshToken(payload) {
    const options = { ...baseOptions, expiresIn: env.refreshTokenTtl };
    return jwt.sign(payload, refreshSecret, options);
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, accessSecret);
    return decoded;
}
export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, refreshSecret);
    return decoded;
}
