import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
import { AdminController } from '../../controllers/admin.controller.js';
import { PostsController } from '../../controllers/posts.controller.js';

export default Router()
  .get('/admin/transactions', requireAuth, requireAdmin, AdminController.transactions)
  .get('/admin/stats', requireAuth, requireAdmin, AdminController.stats)
  .get('/admin/posts', requireAuth, requireAdmin, PostsController.list)
  .post('/admin/posts', requireAuth, requireAdmin, PostsController.create)
  .put('/admin/posts/:id', requireAuth, requireAdmin, PostsController.update)
  .delete('/admin/posts/:id', requireAuth, requireAdmin, PostsController.remove);



