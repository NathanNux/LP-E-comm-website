import fetch from 'node-fetch';

interface GopayPaymentOptions {
    amount: number;
    currency: string;
    orderNumber: string;
    description: string;
    returnUrl: string;
    notificationUrl: string;
    email?: string;
    items: Array<{
        name: string;
        amount: number;
        count: number;
    }>;
}

interface GopayPaymentResult {
    id: string;
    gatewayUrl: string;
    state: string;
}

interface GopayPaymentStatus {
    id: string;
    state: string;
    amount: number;
    currency: string;
}

// GoPay API konfigurace
const GOPAY_API_URL = process.env.GOPAY_API_URL || 'https://gw.sandbox.gopay.com/api';
const GOPAY_CLIENT_ID = process.env.GOPAY_CLIENT_ID;
const GOPAY_CLIENT_SECRET = process.env.GOPAY_CLIENT_SECRET;
const GOPAY_GOID = process.env.GOPAY_GOID;

// Získání přístupového tokenu
async function getAccessToken() {
    try {
        const authString = Buffer.from(`${GOPAY_CLIENT_ID}:${GOPAY_CLIENT_SECRET}`).toString('base64');
        
        const response = await fetch(`${GOPAY_API_URL}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`
            },
            body: 'grant_type=client_credentials&scope=payment-all'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Chyba při získávání tokenu: ${data.error_description || 'Neznámá chyba'}`);
        }
        
        return data.access_token;
    } catch (error) {
        console.error('Chyba při získávání GoPay tokenu:', error);
        throw error;
    }
}

// Vytvoření platby v GoPay
export async function createGopayPayment(options:any) {
    try {
        const token = await getAccessToken();
        
        const paymentData = {
            payer: {
                default_payment_instrument: 'PAYMENT_CARD',
                allowed_payment_instruments: ['PAYMENT_CARD', 'BANK_ACCOUNT', 'APPLE_PAY', 'GPAY'],
                contact: {
                    email: options.email || 'zakaznik@example.com'
                }
            },
            amount: options.amount,
            currency: options.currency,
            order_number: options.orderNumber,
            order_description: options.description,
            items: options.items,
            callback: {
                return_url: options.returnUrl,
                notification_url: options.notificationUrl
            },
            lang: 'CS'
        };
        
        const response = await fetch(`${GOPAY_API_URL}/payments/payment`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Chyba při vytváření platby: ${data.error_description || 'Neznámá chyba'}`);
        }
        
        return {
            id: data.id,
            gatewayUrl: data.gw_url,
            state: data.state
        };
    } catch (error) {
        console.error('Chyba při vytváření GoPay platby:', error);
        throw error;
    }
}

// Získání stavu platby
export async function getGopayPaymentStatus(paymentId:any) {
    try {
        const token = await getAccessToken();
        
        const response = await fetch(`${GOPAY_API_URL}/payments/payment/${paymentId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Chyba při získávání stavu platby: ${data.error_description || 'Neznámá chyba'}`);
        }
        
        return {
            id: data.id,
            state: data.state,
            amount: data.amount,
            currency: data.currency
        };
    } catch (error) {
        console.error('Chyba při získávání stavu GoPay platby:', error);
        throw error;
    }
}

// Webhook pro zpracování GoPay notifikací
export async function processGopayWebhook(payload:any) {
    try {
        // Získání stavu platby z GoPay
        const paymentStatus = await getGopayPaymentStatus(payload.id);
        
        // Zpracování platby podle stavu
        if (paymentStatus.state === 'PAID') {
            // Platba byla úspěšně dokončena
            return {
                success: true,
                paymentId: paymentStatus.id,
                state: paymentStatus.state
            };
        } else {
            // Platba nebyla dokončena
            return {
                success: false,
                paymentId: paymentStatus.id,
                state: paymentStatus.state
            };
        }
    } catch (error) {
        console.error('Chyba při zpracování GoPay webhooku:', error);
        throw error;
    }
}