import { Router } from 'express';
import { UnsplashController } from '../../controllers/unsplash.controller.js';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';

export default Router()
  .get('/unsplash/search', requireAuth, requireAdmin, UnsplashController.search)
  .get('/unsplash/photo/:id', requireAuth, requireAdmin, UnsplashController.getPhoto)
  .post('/unsplash/track-download', requireAuth, requireAdmin, UnsplashController.trackDownload)
  .get('/unsplash/categories', requireAuth, requireAdmin, UnsplashController.getCategories);
