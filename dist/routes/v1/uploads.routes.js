import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
import { uploadSingle, uploadMultiple } from '../../middlewares/upload.js';
import { UploadsController } from '../../controllers/uploads.controller.js';
export default Router()
    .post('/admin/uploads', requireAuth, requireAdmin, uploadSingle, UploadsController.uploadImage)
    .post('/admin/uploads/multiple', requireAuth, requireAdmin, uploadMultiple, UploadsController.uploadMultipleImages);
