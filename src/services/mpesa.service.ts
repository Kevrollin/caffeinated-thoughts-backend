import axios from 'axios';
import crypto from 'crypto';

interface STKPushRequest {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

export class MpesaService {
  private baseURL: string;
  private consumerKey: string;
  private consumerSecret: string;
  private shortcode: string;
  private passkey: string;
  private environment: 'sandbox' | 'production';
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor() {
    this.baseURL = process.env.MPESA_ENV === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.shortcode = process.env.MPESA_SHORTCODE || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.environment = (process.env.MPESA_ENV as 'sandbox' | 'production') || 'sandbox';
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token || '';
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in || 3600) - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  }

  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return password;
  }

  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      // Check if we have the required environment variables
      if (!this.consumerKey || !this.consumerSecret || !this.shortcode || !this.passkey) {
        console.error('M-Pesa credentials not configured');
        return {
          success: false,
          error: 'M-Pesa credentials not configured. Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY environment variables.',
        };
      }

      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: request.amount,
        PartyA: request.phone,
        PartyB: this.shortcode,
        PhoneNumber: request.phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/v1/mpesa/callback',
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc,
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { ResponseCode, ResponseDescription, CheckoutRequestID, MerchantRequestID } = response.data;

      if (ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: CheckoutRequestID,
          merchantRequestId: MerchantRequestID,
        };
      } else {
        return {
          success: false,
          error: ResponseDescription,
        };
      }
    } catch (error: any) {
      console.error('STK Push error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.errorMessage || 'STK Push failed',
        };
      }

      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async querySTKPushStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('STK Push query error:', error);
      throw error;
    }
  }

  // Method to simulate STK Push for testing (sandbox only)
  async simulateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    if (this.environment === 'production') {
      throw new Error('Simulation not allowed in production');
    }

    // For sandbox, we'll simulate a successful response
    const mockCheckoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      checkoutRequestId: mockCheckoutRequestId,
    };
  }
}
