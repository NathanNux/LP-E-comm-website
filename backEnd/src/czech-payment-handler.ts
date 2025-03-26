import { PaymentMethodHandler, CreatePaymentResult, SettlePaymentResult, LanguageCode } from '@vendure/core';
import { createGopayPayment, getGopayPaymentStatus, processGopayWebhook } from './gopay-client';

/**
 * Platební handler pro české platební metody
 */


export const czechPaymentMethodHandler = new PaymentMethodHandler({
    code: 'czech-payment-method', // Hlavní kód handleru
    description: [{ languageCode: LanguageCode.en, value: 'Platební metody pro český trh' }],
    args: {},

    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        // Logování pro diagnostiku
        console.log("Vytvářím platbu s metodou:", metadata.paymentMethod);
        console.log("Metadata platby:", metadata);
        
        const paymentMethod = metadata.paymentMethod;
        
        switch (paymentMethod) {
            case 'bank-transfer':
                // Implementace pro bankovní převod
                return {
                    amount,
                    state: 'Authorized',
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
                    state: 'Authorized',
                    transactionId: `cod-${Date.now()}`,
                    metadata: {
                        paymentMethod: 'cash-on-delivery',
                    },
                };
            
            case 'gopay':
                try {
                    // Vytvoření platby v GoPay
                    const gopayPayment = await createGopayPayment({
                        amount,
                        currency: order.currencyCode,
                        orderNumber: order.code,
                        description: `Objednávka ${order.code}`,
                        returnUrl: `${process.env.FRONTEND_URL}/checkout/payment-result`,
                        notificationUrl: `${process.env.BACKEND_URL}/gopay-webhook`,
                        items: order.lines.map(line => ({
                            name: line.productVariant.name,
                            amount: line.linePriceWithTax,
                            count: line.quantity
                        }))
                    });

                    return {
                        amount,
                        state: 'Authorized',
                        transactionId: gopayPayment.id,
                        metadata: {
                            paymentMethod: 'gopay',
                            gopayPaymentId: gopayPayment.id,
                            paymentUrl: gopayPayment.gatewayUrl,
                        },
                    };
                } catch (error:any) {
                    return {
                        amount,
                        state: 'Declined',
                        transactionId: `gopay-error-${Date.now()}`,
                        errorMessage: `Chyba při vytváření GoPay platby: ${error.message}`,
                    };
                }
            
            default:
                return {
                    amount,
                    state: 'Declined',
                    transactionId: `error-${Date.now()}`,
                    errorMessage: `Neplatná platební metoda ${paymentMethod}`,
                };
        }
    },

    settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
        // Pro GoPay kontrolujeme stav platby
        if (payment.metadata && payment.metadata.paymentMethod === 'gopay') {
            try {
                const gopayPaymentId = payment.metadata.gopayPaymentId;
                const paymentStatus = await getGopayPaymentStatus(gopayPaymentId);
                
                if (paymentStatus.state === 'PAID') {
                    return { success: true };
                } else {
                    // Místo vrácení { success: false }, vyhodíme chybu
                    throw new Error(`Platba není dokončena (status: ${paymentStatus.state})`);
                }
            } catch (error: any) {
                // Vyhodíme chybu pro zachycení Vendure zpracováním
                throw new Error(`Chyba při kontrole stavu GoPay platby: ${error.message}`);
            }
        }
        
        // Pro ostatní platební metody vraťte success
        return { success: true };
    },
});