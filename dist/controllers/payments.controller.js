import { prisma } from '../services/prisma.js';
import { MpesaService } from '../services/mpesa.service.js';
import { z } from 'zod';
const stkPushSchema = z.object({
    phone: z.string().min(10).max(15),
    amount: z.number().min(1).max(70000),
    postId: z.string().optional(),
});
export const PaymentsController = {
    stkPush: async (req, res) => {
        try {
            console.log('STK Push request received:', req.body);
            const { phone, amount, postId } = stkPushSchema.parse(req.body);
            console.log('Parsed data:', { phone, amount, postId });
            // Format phone number (ensure it starts with 254)
            const formattedPhone = phone.startsWith('254') ? phone :
                phone.startsWith('0') ? `254${phone.slice(1)}` :
                    `254${phone}`;
            console.log('Formatted phone:', formattedPhone);
            // Create transaction record
            console.log('Creating transaction record...');
            // Validate postId if provided
            let validPostId = null;
            if (postId && postId !== 'test') {
                // Check if the post exists
                const existingPost = await prisma.post.findUnique({
                    where: { id: postId }
                });
                if (existingPost) {
                    validPostId = postId;
                }
                else {
                    console.log('Post not found, creating transaction without postId');
                }
            }
            // Generate a temporary unique ID for the transaction
            const tempCheckoutId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const transaction = await prisma.transaction.create({
                data: {
                    phone: formattedPhone,
                    amount,
                    postId: validPostId,
                    status: 'PENDING',
                    checkoutRequestId: tempCheckoutId, // Will be updated after STK push
                    merchantRequestId: '', // Will be updated after STK push
                },
            });
            // Initiate STK Push
            console.log('Initiating STK Push...');
            const mpesaService = new MpesaService();
            const stkPushResult = await mpesaService.initiateSTKPush({
                phone: formattedPhone,
                amount,
                accountReference: `POST_${transaction.id}`,
                transactionDesc: 'Buy me a coffee',
            });
            console.log('STK Push result:', stkPushResult);
            if (stkPushResult.success) {
                // Update transaction with checkout request ID
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        checkoutRequestId: stkPushResult.checkoutRequestId,
                        merchantRequestId: stkPushResult.merchantRequestId || '',
                    },
                });
                return res.json({
                    success: true,
                    message: 'STK Push sent successfully',
                    checkoutRequestId: stkPushResult.checkoutRequestId,
                    transactionId: transaction.id,
                });
            }
            else {
                // Update transaction status to failed
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED' },
                });
                return res.status(400).json({
                    error: {
                        message: stkPushResult.error || 'Failed to initiate STK Push',
                        code: 'STK_PUSH_FAILED',
                    },
                });
            }
        }
        catch (error) {
            console.error('STK Push error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: {
                        message: 'Invalid request data',
                        code: 'VALIDATION_ERROR',
                        details: error.issues,
                    },
                });
            }
            return res.status(500).json({
                error: {
                    message: 'Internal server error',
                    code: 'INTERNAL_ERROR',
                },
            });
        }
    },
    callback: async (req, res) => {
        try {
            const { Body } = req.body;
            const stkCallback = Body.stkCallback;
            if (!stkCallback) {
                return res.status(400).json({ error: { message: 'Invalid callback data' } });
            }
            const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
            // Find transaction by checkout request ID
            const transaction = await prisma.transaction.findFirst({
                where: { checkoutRequestId: CheckoutRequestID },
            });
            if (!transaction) {
                console.error('Transaction not found for checkout request:', CheckoutRequestID);
                return res.status(404).json({ error: { message: 'Transaction not found' } });
            }
            let status = 'FAILED';
            let mpesaReceiptNumber = '';
            console.log('M-Pesa callback received:', { CheckoutRequestID, ResultCode, ResultDesc });
            if (ResultCode === 0) {
                // Success
                status = 'SUCCESS';
                // Extract receipt number from callback metadata
                if (CallbackMetadata && CallbackMetadata.Item) {
                    const receiptItem = CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber');
                    if (receiptItem) {
                        mpesaReceiptNumber = receiptItem.Value;
                    }
                }
            }
            else {
                // Other errors (including user cancellation)
                status = 'FAILED';
                console.log('M-Pesa payment failed:', { ResultCode, ResultDesc });
            }
            // Update transaction
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status,
                    mpesaReceiptNumber,
                    rawResponse: {
                        resultCode: ResultCode,
                        resultDescription: ResultDesc,
                    },
                },
            });
            console.log(`Transaction ${transaction.id} updated to ${status}`);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('Callback error:', error);
            return res.status(500).json({ error: { message: 'Callback processing failed' } });
        }
    },
    getStatus: async (req, res) => {
        try {
            const { checkoutRequestId } = req.params;
            const transaction = await prisma.transaction.findFirst({
                where: { checkoutRequestId },
            });
            if (!transaction) {
                return res.status(404).json({
                    error: { message: 'Transaction not found', code: 'NOT_FOUND' },
                });
            }
            return res.json({
                transactionId: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                phone: transaction.phone,
                mpesaReceiptNumber: transaction.mpesaReceiptNumber,
                rawResponse: transaction.rawResponse,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
            });
        }
        catch (error) {
            console.error('Get status error:', error);
            return res.status(500).json({
                error: { message: 'Failed to get transaction status', code: 'INTERNAL_ERROR' },
            });
        }
    },
};
