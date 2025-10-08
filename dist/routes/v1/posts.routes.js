import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { PostsController } from '../../controllers/posts.controller.js';
export default Router()
    .get('/posts', PostsController.list)
    .get('/posts/:slug', PostsController.getBySlug)
    .get('/admin/posts/:id', requireAuth, requireAdmin, PostsController.getById)
    .post('/admin/posts', requireAuth, requireAdmin, PostsController.create)
    .put('/admin/posts/:id', requireAuth, requireAdmin, PostsController.update)
    .delete('/admin/posts/:id', requireAuth, requireAdmin, PostsController.remove);
