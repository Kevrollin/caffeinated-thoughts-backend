import axios from 'axios';
export class MpesaService {
    constructor() {
        this.accessToken = '';
        this.tokenExpiry = 0;
        this.baseURL = process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
        this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
        this.shortcode = process.env.MPESA_SHORTCODE || '';
        this.passkey = process.env.MPESA_PASSKEY || '';
        this.environment = process.env.MPESA_ENV || 'sandbox';
    }
    async getAccessToken() {
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
        }
        catch (error) {
            console.error('Error getting access token:', error);
            throw new Error('Failed to get M-Pesa access token');
        }
    }
    generateTimestamp() {
        return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    }
    generatePassword() {
        const timestamp = this.generateTimestamp();
        const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
        return password;
    }
    async initiateSTKPush(request) {
        try {
            // Check if we have the required environment variables
            if (!this.consumerKey || !this.consumerSecret || !this.shortcode || !this.passkey) {
                console.error('M-Pesa credentials not configured');
                return {
                    success: false,
                    error: 'M-Pesa credentials not configured. Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY environment variables.',
                };
            }
            // Validate phone number format
            if (!this.isValidPhoneNumber(request.phone)) {
                return {
                    success: false,
                    error: 'Invalid phone number format. Please use a valid Kenyan phone number.',
                };
            }
            // Validate amount
            if (request.amount < 1 || request.amount > 70000) {
                return {
                    success: false,
                    error: 'Invalid amount. Amount must be between 1 and 70,000 KES.',
                };
            }
            const accessToken = await this.getAccessToken();
            const timestamp = this.generateTimestamp();
            const password = this.generatePassword();
            // For Till STK Push, BusinessShortCode and PartyB MUST be the same Till number
            const tillNumber = 6052176;
            const payload = {
                BusinessShortCode: tillNumber,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline', // Correct for Tills
                Amount: request.amount,
                PartyA: request.phone, // Customer’s phone
                PartyB: tillNumber, // Same Till number
                PhoneNumber: request.phone,
                CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://caffeinated-thoughts-backend.onrender.com/api/v1/mpesa/callback',
                AccountReference: request.accountReference,
                TransactionDesc: request.transactionDesc,
            };
            console.log('=== BUSINESS TILL STK PUSH DETAILED LOGGING ===');
            console.log('STK Push payload:', JSON.stringify(payload, null, 2));
            console.log('Till Number (BusinessShortCode & PartyB):', tillNumber);
            console.log('Transaction Type:', payload.TransactionType);
            console.log('Environment:', this.environment);
            console.log('Phone number:', request.phone);
            console.log('Amount:', request.amount);
            console.log('Account Reference:', request.accountReference);
            console.log('Transaction Description:', request.transactionDesc);
            console.log('Callback URL:', payload.CallBackURL);
            console.log('===============================================');
            const response = await axios.post(`${this.baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 second timeout
            });
            console.log('M-Pesa STK Push response:', JSON.stringify(response.data, null, 2));
            const { ResponseCode, ResponseDescription, CheckoutRequestID, MerchantRequestID } = response.data;
            if (ResponseCode === '0') {
                return {
                    success: true,
                    checkoutRequestId: CheckoutRequestID,
                    merchantRequestId: MerchantRequestID,
                };
            }
            else {
                console.error('=== BUSINESS TILL STK PUSH FAILED ===');
                console.error('Response Code:', ResponseCode);
                console.error('Response Description:', ResponseDescription);
                console.error('Till Number:', tillNumber);
                console.error('Transaction Type:', payload.TransactionType);
                console.error('Phone Number:', request.phone);
                console.error('Amount:', request.amount);
                console.error('=====================================');
                // Provide more specific error messages for common issues
                let errorMessage = ResponseDescription;
                if (ResponseCode === '1') {
                    errorMessage = 'Till number not found or not configured for STK Push';
                }
                else if (ResponseCode === '2') {
                    errorMessage = 'Till number not active or suspended';
                }
                else if (ResponseCode === '3') {
                    errorMessage = 'Invalid phone number format';
                }
                else if (ResponseCode === '2002') {
                    errorMessage = 'Business Till number and PartyB mismatch. For Business Till STK Push, both must be the same.';
                }
                return {
                    success: false,
                    error: errorMessage,
                    responseCode: ResponseCode,
                };
            }
        }
        catch (error) {
            console.error('STK Push error:', error);
            if (error.response?.data) {
                console.error('M-Pesa API error response:', error.response.data);
                return {
                    success: false,
                    error: error.response.data.errorMessage || error.response.data.error_description || 'STK Push failed',
                };
            }
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout. Please try again.',
                };
            }
            return {
                success: false,
                error: 'Network error occurred. Please check your connection and try again.',
            };
        }
    }
    isValidPhoneNumber(phone) {
        // Remove any non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        // Check if it's a valid Kenyan phone number
        // Should start with 254 and be 12 digits total
        return /^254[17]\d{8}$/.test(cleaned);
    }
    getBusinessShortCode() {
        // For Business Till, use the main business shortcode from environment
        console.log('Using Business Till shortcode from MPESA_SHORTCODE:', this.shortcode);
        return parseInt(this.shortcode);
    }
    getStoreNumber() {
        // For Business Till, Store number is ALWAYS the same as Business ShortCode
        // This is the standard configuration for Business Till numbers
        const businessShortCode = this.getBusinessShortCode();
        console.log('Business Till: Store Number = Business ShortCode =', businessShortCode);
        return businessShortCode;
    }
    async querySTKPushStatus(checkoutRequestId) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.generateTimestamp();
            const password = this.generatePassword();
            const payload = {
                BusinessShortCode: parseInt(this.shortcode),
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId,
            };
            const response = await axios.post(`${this.baseURL}/mpesa/stkpushquery/v1/query`, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('STK Push query error:', error);
            throw error;
        }
    }
    // Method to simulate STK Push for testing (sandbox only)
    async simulateSTKPush(request) {
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
    // Diagnostic method to test Till number configuration
    async testTillConfiguration() {
        try {
            const businessShortCode = this.getBusinessShortCode(); // Agent Number
            const storeNumber = this.getStoreNumber(); // Store Number
            const accessToken = await this.getAccessToken();
            console.log('=== BUSINESS TILL CONFIGURATION TEST ===');
            console.log('Business Till Number (BusinessShortCode):', businessShortCode);
            console.log('Store Number (PartyB):', storeNumber);
            console.log('Business Till Type: Business Till (not PayBill)');
            console.log('Environment:', this.environment);
            console.log('Access Token Status:', accessToken ? 'Valid' : 'Invalid');
            console.log('MPESA_SHORTCODE from env:', process.env.MPESA_SHORTCODE);
            console.log('Business Till Number from constructor:', this.shortcode);
            console.log('Transaction Type: CustomerBuyGoodsOnline');
            console.log('==========================================');
            return {
                success: true,
                businessTillNumber: businessShortCode,
                storeNumber: storeNumber,
                tillType: 'Business Till',
                environment: this.environment,
                accessTokenValid: !!accessToken,
                mpesaShortcodeEnv: process.env.MPESA_SHORTCODE,
                businessTillFromConstructor: this.shortcode,
                transactionType: 'CustomerBuyGoodsOnline',
                callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://caffeinated-thoughts-backend.onrender.com/api/v1/mpesa/callback',
            };
        }
        catch (error) {
            console.error('Till configuration test failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
