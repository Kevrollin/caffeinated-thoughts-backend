import { Router } from 'express';
import { PaymentsController } from '../../controllers/payments.controller.js';
export default Router()
    .get('/payments/test-mpesa', PaymentsController.testMpesaCredentials)
    .post('/payments/test-phone', PaymentsController.testPhoneNumber)
    .post('/payments/diagnostics', PaymentsController.diagnostics)
    .post('/payments/stkpush', PaymentsController.stkPush)
    .post('/mpesa/callback', PaymentsController.callback)
    .get('/payments/:checkoutRequestId/status', PaymentsController.getStatus);
