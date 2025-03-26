import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { processGopayWebhook } from './gopay-client';
import { Request, Response } from 'express';
import { czechPaymentMethodHandler } from './czech-payment-handler';
import {gql} from 'graphql-request';

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        // Ujistíme se, že platební handler je součástí konfigurace
        const existingHandlers = config.paymentOptions.paymentMethodHandlers || [];
        
        // Zkontrolujeme, zda už handler není přidán
        if (!existingHandlers.includes(czechPaymentMethodHandler)) {
            config.paymentOptions.paymentMethodHandlers.push(czechPaymentMethodHandler);
        }
        
        return config;
    },
    controllers: [],
    providers: [],
    shopApiExtensions: {
        resolvers: [],
    },
    adminApiExtensions: {
        resolvers: [],
    },
})
export class GopayPlugin {
    static init() {
        return {
            name: 'GoPay Plugin',
            apiExtensions: {
                handlers: [
                    {
                        route: 'gopay-webhook',
                        method: 'POST',
                        handler: async (req: Request, res: Response) => {
                            try {
                                const result = await processGopayWebhook(req.body);
                                res.status(200).send(result);
                            } catch (error:any) {
                                console.error('Chyba při zpracování GoPay webhooku:', error);
                                res.status(500).send({ success: false, error: error.message });
                            }
                        },
                    },
                ],
            },
        };
    }
}