import { Router } from 'express';
import { PaymentsController } from '../../controllers/payments.controller.js';
export default Router()
    .post('/payments/stkpush', PaymentsController.stkPush)
    .post('/mpesa/callback', PaymentsController.callback)
    .get('/payments/:checkoutRequestId/status', PaymentsController.getStatus);
