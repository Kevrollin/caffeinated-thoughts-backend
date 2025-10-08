import { Router } from 'express';
import auth from './v1/auth.routes.js';
import posts from './v1/posts.routes.js';
import threads from './v1/threads.routes.js';
import uploads from './v1/uploads.routes.js';
import payments from './v1/payments.routes.js';
import admin from './v1/admin.routes.js';
import unsplash from './v1/unsplash.routes.js';
import newsletter from './v1/newsletter.routes.js';

export const router = Router();
router.get('/v1/healthz', (_req, res) => res.json({ status: 'ok' }));
router.use('/v1', auth);
router.use('/v1', posts);
router.use('/v1', threads);
router.use('/v1', uploads);
router.use('/v1', payments);
router.use('/v1', admin);
router.use('/v1', unsplash);
router.use('/v1', newsletter);



