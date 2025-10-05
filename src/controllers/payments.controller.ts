import { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { MpesaService } from '../services/mpesa.service.js';
import { z } from 'zod';

const stkPushSchema = z.object({
  phone: z.string().min(10).max(15),
  amount: z.number().min(1).max(70000),
  postId: z.string().optional(),
});

export const PaymentsController = {
  // Test M-Pesa credentials
  testMpesaCredentials: async (req: Request, res: Response) => {
    try {
      const mpesaService = new MpesaService();
      const accessToken = await mpesaService.getAccessToken();
      
      return res.json({
        success: true,
        message: 'M-Pesa credentials are valid',
        hasAccessToken: !!accessToken,
        environment: process.env.MPESA_ENV,
        shortcode: process.env.MPESA_SHORTCODE,
        callbackUrl: process.env.MPESA_CALLBACK_URL,
        consumerKey: process.env.MPESA_CONSUMER_KEY ? 'Set' : 'Not set',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET ? 'Set' : 'Not set',
        passkey: process.env.MPESA_PASSKEY ? 'Set' : 'Not set',
      });
    } catch (error: any) {
      console.error('M-Pesa credentials test failed:', error);
      return res.status(400).json({
        error: {
          message: 'M-Pesa credentials test failed',
          details: error?.message || 'Unknown error',
        },
      });
    }
  },

  // Test phone number registration
  testPhoneNumber: async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          error: { message: 'Phone number is required' }
        });
      }

      // Format phone number
      const formattedPhone = phone.startsWith('254') ? phone : 
                           phone.startsWith('0') ? `254${phone.slice(1)}` : 
                           `254${phone}`;

      // Validate phone number format
      const phoneRegex = /^254[17]\d{8}$/;
      if (!phoneRegex.test(formattedPhone)) {
        return res.status(400).json({
          error: { 
            message: 'Invalid phone number format. Please use a valid Kenyan phone number (e.g., 0712345678)',
            phone: formattedPhone
          }
        });
      }

      // Try a small test STK Push (1 KES) to test phone number
      const mpesaService = new MpesaService();
      const testResult = await mpesaService.initiateSTKPush({
        phone: formattedPhone,
        amount: 1, // Test with 1 KES
        accountReference: `TEST_${Date.now()}`,
        transactionDesc: 'Phone number test',
      });

      return res.json({
        success: testResult.success,
        message: testResult.success ? 'Phone number test initiated' : 'Phone number test failed',
        phone: formattedPhone,
        testResult,
        environment: process.env.MPESA_ENV,
        shortcode: process.env.MPESA_SHORTCODE,
      });
    } catch (error: any) {
      console.error('Phone number test failed:', error);
      return res.status(400).json({
        error: {
          message: 'Phone number test failed',
          details: error?.message || 'Unknown error',
        },
      });
    }
  },

  // Comprehensive M-Pesa diagnostics
  diagnostics: async (req: Request, res: Response) => {
    try {
      const mpesaService = new MpesaService();
      
      // Test access token
      let accessTokenStatus = 'failed';
      let accessToken = '';
      try {
        accessToken = await mpesaService.getAccessToken();
        accessTokenStatus = 'success';
      } catch (error) {
        console.error('Access token test failed:', error);
      }

      // Check environment variables
      const envCheck = {
        MPESA_ENV: process.env.MPESA_ENV || 'Not set',
        MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY ? 'Set' : 'Not set',
        MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET ? 'Set' : 'Not set',
        MPESA_SHORTCODE: process.env.MPESA_SHORTCODE || 'Not set',
        MPESA_PASSKEY: process.env.MPESA_PASSKEY ? 'Set' : 'Not set',
        MPESA_CALLBACK_URL: process.env.MPESA_CALLBACK_URL || 'Not set',
        MPESA_STK_SHORTCODE: process.env.MPESA_STK_SHORTCODE || 'Not set (using main shortcode)',
      };

      // Test with a known good phone number (if provided)
      const { testPhone } = req.body;
      let phoneTestResult = null;
      
      if (testPhone) {
        try {
          const formattedPhone = testPhone.startsWith('254') ? testPhone : 
                               testPhone.startsWith('0') ? `254${testPhone.slice(1)}` : 
                               `254${testPhone}`;
          
          const testResult = await mpesaService.initiateSTKPush({
            phone: formattedPhone,
            amount: 1,
            accountReference: `DIAG_${Date.now()}`,
            transactionDesc: 'Diagnostic test',
          });
          
          phoneTestResult = {
            phone: formattedPhone,
            success: testResult.success,
            error: testResult.error,
          };
        } catch (error: any) {
          phoneTestResult = {
            phone: testPhone,
            success: false,
            error: error.message,
          };
        }
      }

      return res.json({
        success: true,
        message: 'M-Pesa diagnostics completed',
        accessToken: {
          status: accessTokenStatus,
          hasToken: !!accessToken,
        },
        environment: envCheck,
        phoneTest: phoneTestResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Diagnostics failed:', error);
      return res.status(500).json({
        error: {
          message: 'Diagnostics failed',
          details: error?.message || 'Unknown error',
        },
      });
    }
  },

  stkPush: async (req: Request, res: Response) => {
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
        } else {
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
      } else {
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
    } catch (error) {
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

  callback: async (req: Request, res: Response) => {
    try {
      console.log('=== M-PESA CALLBACK RECEIVED ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers);
      
      const { Body } = req.body;
      const stkCallback = Body.stkCallback;

      if (!stkCallback) {
        console.error('Invalid callback data - no stkCallback found');
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

      let status: 'SUCCESS' | 'FAILED' = 'FAILED';
      let mpesaReceiptNumber = '';

      console.log('M-Pesa callback received:', { CheckoutRequestID, ResultCode, ResultDesc });
      
      // Log detailed error information for debugging
      if (ResultCode !== 0) {
        console.log('=== M-PESA ERROR DETAILS ===');
        console.log('ResultCode:', ResultCode);
        console.log('ResultDesc:', ResultDesc);
        console.log('Transaction ID:', transaction.id);
        console.log('Phone Number:', transaction.phone);
        console.log('Amount:', transaction.amount);
        console.log('Business ShortCode:', process.env.MPESA_SHORTCODE);
        console.log('Environment:', process.env.MPESA_ENV);
        
        // Common ResultCode meanings
        const errorMeanings = {
          2029: 'Failed due to an unresolved reason type - Usually business account or phone number issue',
          1032: 'Request cancelled by user',
          2001: 'Wrong PIN entered',
          11: 'Unable to lock subscriber',
          1: 'Unable to get phone number',
          2: 'Unable to get phone number',
          3: 'Unable to get phone number',
          4: 'Unable to get phone number',
          5: 'Unable to get phone number',
          6: 'Unable to get phone number',
          7: 'Unable to get phone number',
          8: 'Unable to get phone number',
          9: 'Unable to get phone number',
          10: 'Unable to get phone number'
        };
        
        console.log('Error meaning:', errorMeanings[ResultCode as keyof typeof errorMeanings] || 'Unknown error code');
        console.log('=============================');
      }

      if (ResultCode === 0) {
        // Success
        status = 'SUCCESS';
        
        // Extract receipt number from callback metadata
        if (CallbackMetadata && CallbackMetadata.Item) {
          const receiptItem = CallbackMetadata.Item.find((item: any) => 
            item.Name === 'MpesaReceiptNumber'
          );
          if (receiptItem) {
            mpesaReceiptNumber = receiptItem.Value;
          }
        }
      } else {
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
    } catch (error) {
      console.error('Callback error:', error);
      return res.status(500).json({ error: { message: 'Callback processing failed' } });
    }
  },

  getStatus: async (req: Request, res: Response) => {
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
    } catch (error) {
      console.error('Get status error:', error);
      return res.status(500).json({
        error: { message: 'Failed to get transaction status', code: 'INTERNAL_ERROR' },
      });
    }
  },
};
