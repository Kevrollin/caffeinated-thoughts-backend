import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
// Use Express built-in body parsers to avoid CJS/ESM interop issues
import { errorHandler, notFoundHandler, requestId } from './utils/http.js';
import { router as apiRouter } from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './utils/openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestId());
  app.use(helmet());
  app.use((req, _res, next) => {
  if (req.headers.origin) {
    console.log("🌍 Incoming Origin:", req.headers.origin);
  }
  next();
});

  
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : [
            "http://localhost:8080", // local dev
            "https://patch-notes-dev.vercel.app", // New PatchNotes frontend
            "https://caffeinated-thoughts-five.vercel.app", // Old frontend
            "http://localhost:3000" // local frontend fallback
          ],
      credentials: true,
    })
  );
  
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/v1/auth', authLimiter);

  // Serve static files from public directory
  app.use('/assets', express.static(path.join(__dirname, '../public')));
  
  app.use('/api', apiRouter);
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapiSpec));
  app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
