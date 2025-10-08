import { Router } from 'express';
import { NewsletterController } from '../../controllers/newsletter.controller.js';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
export default Router()
    .post('/newsletter/subscribe', NewsletterController.subscribe)
    .post('/newsletter/unsubscribe', NewsletterController.unsubscribe)
    .get('/newsletter/status', NewsletterController.getStatus)
    .get('/admin/newsletter/subscribers', requireAuth, requireAdmin, NewsletterController.getSubscribers);
