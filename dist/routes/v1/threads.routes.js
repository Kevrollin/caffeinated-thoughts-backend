import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { ThreadsController } from '../../controllers/threads.controller.js';
export default Router()
    .get('/threads', ThreadsController.list)
    .get('/threads/:slug', ThreadsController.getBySlug)
    .post('/admin/threads', requireAuth, requireAdmin, ThreadsController.create)
    .put('/admin/threads/:id', requireAuth, requireAdmin, ThreadsController.update)
    .delete('/admin/threads/:id', requireAuth, requireAdmin, ThreadsController.remove)
    .post('/admin/threads/:id/posts', requireAuth, requireAdmin, ThreadsController.addPost)
    .delete('/admin/threads/:id/posts', requireAuth, requireAdmin, ThreadsController.removePost)
    .put('/admin/threads/:id/reorder', requireAuth, requireAdmin, ThreadsController.reorderPosts);
