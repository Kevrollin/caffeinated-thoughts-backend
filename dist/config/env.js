import dotenv from 'dotenv';
dotenv.config();
function requireEnv(name, fallback) {
    const val = process.env[name] ?? fallback;
    if (val === undefined)
        throw new Error(`Missing env var ${name}`);
    return val;
}
export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 4000),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    databaseUrl: requireEnv('DATABASE_URL', ''),
    jwtAccessSecret: requireEnv('JWT_ACCESS_TOKEN_SECRET', 'dev-access'),
    jwtRefreshSecret: requireEnv('JWT_REFRESH_TOKEN_SECRET', 'dev-refresh'),
    accessTokenTtl: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenTtl: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    storageProvider: process.env.STORAGE_PROVIDER || 'cloudinary',
    mpesa: {
        env: process.env.MPESA_ENV || 'sandbox',
        consumerKey: process.env.MPESA_CONSUMER_KEY || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        shortcode: process.env.MPESA_SHORTCODE || '',
        passkey: process.env.MPESA_PASSKEY || '',
        callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:4000/api/v1/mpesa/callback',
        minAmount: Number(process.env.MIN_COFFEE_AMOUNT || 50),
    },
    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'changemeStrong!1',
    },
};
