import { PaymentMethodHandler, CreatePaymentResult, SettlePaymentResult, LanguageCode } from '@vendure/core';

/**
 * Platební handler pro české platební metody
 */
export const czechPaymentMethodHandler = new PaymentMethodHandler({
    code: 'czech-payment-method',
    description: [{ languageCode: LanguageCode.en, value: 'Platební metody pro český trh' }], // Oprava: použití LanguageCode.en místo "en"
    args: {},

    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        const paymentMethod = metadata.paymentMethod;
        
        switch (paymentMethod) {
            case 'bank-transfer':
                // Implementace pro bankovní převod
                return {
                    amount,
                    state: 'Authorized', // validní stav
                    transactionId: `bank-transfer-${Date.now()}`,
                    metadata: {
                        paymentMethod: 'bank-transfer',
                        bankDetails: {
                            accountNumber: '1234567890/0800',
                            variableSymbol: order.code,
                        },
                    },
                };
            
            case 'cash-on-delivery':
                // Implementace pro dobírku
                return {
                    amount,
                    state: 'Authorized', // validní stav
                    transactionId: `cod-${Date.now()}`,
                    metadata: {
                        paymentMethod: 'cash-on-delivery',
                    },
                };
            
            // Další platební metody...
            
            default:
                // Nepoužívejte "Error" jako stav, místo toho vyhoďte výjimku
                // nebo použijte validní stav a nastavte errorMessage
                return {
                    amount,
                    state: 'Declined', // validní stav místo "Error"
                    transactionId: `error-${Date.now()}`,
                    errorMessage: `Neplatná platební metoda ${paymentMethod}`,
                };
        }
    },

    settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
        return { success: true };
    },
});