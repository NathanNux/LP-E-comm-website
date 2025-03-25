declare global {
    interface Window {
      google: {
        payments: {
          api: {
            PaymentsClient: new (config: any) => {
              isReadyToPay: (request: any) => Promise<any>;
              createButton: (options: any) => HTMLElement;
              loadPaymentData: (request: any) => Promise<any>;
            };
          };
        };
      };
    }
  }
  
  const VENDURE_API_URL = "http://localhost:3000/shop-api";
  
  export function initGooglePay(totalPrice: number, onPaymentSuccess: (paymentData: any) => void) {
    // Kontrola, zda jsme v prohlížeči a Google Pay je dostupný
    if (typeof window === 'undefined' || !window.google || !window.google.payments || !window.google.payments.api) {
      console.error('Google Pay API není dostupné');
      return;
    }
  
    console.log('Google Pay API je dostupný, pokračuji v inicializaci');
  
    const allowedCardNetworks = ["MASTERCARD", "VISA"];
    const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];
  
    // Definice základní platební metody CARD
    const baseCardPaymentMethod = {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks,
        billingAddressRequired: false
      }
    };
  
    // Definice pro tokenizaci platby
    const tokenizationSpecification = {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        'gateway': 'example',
        'gatewayMerchantId': 'exampleGatewayMerchantId'
      }
    };
  
    // Kompletní platební metoda s tokenizací pro skutečnou platbu
    const cardPaymentMethod = Object.assign(
      {},
      baseCardPaymentMethod,
      {
        tokenizationSpecification: tokenizationSpecification
      }
    );
  
    // Základní požadavek pro isReadyToPay - MUSÍ obsahovat allowedPaymentMethods
    const baseRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [baseCardPaymentMethod]  // TOTO je důležité pro isReadyToPay
    };
  
    // Požadavek pro skutečnou platbu
    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [cardPaymentMethod],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: totalPrice.toFixed(2),
        currencyCode: 'CZK',
        countryCode: 'CZ'
      },
      merchantInfo: {
        merchantName: 'E-shop Demo',
        merchantId: '12345678901234567890'
      }
    };
  
    try {
      console.log('Vytvářím PaymentsClient...');
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: 'TEST'
      });
  
      console.log('Kontroluji isReadyToPay...');
      paymentsClient.isReadyToPay(baseRequest)
        .then(function(response) {
          console.log('isReadyToPay response:', response);
          
          if (response.result) {
            console.log('Google Pay je dostupný, vytvářím tlačítko...');
            
            const button = paymentsClient.createButton({
              onClick: () => {
                console.log('Kliknuto na Google Pay tlačítko, načítám platební data...');
                paymentsClient.loadPaymentData(paymentDataRequest)
                  .then(function(paymentData) {
                    console.log('Úspěšná platba Google Pay:', paymentData);
                    onPaymentSuccess(paymentData);
                  })
                  .catch(function(err) {
                    console.error('Chyba při platbě Google Pay:', err);
                  });
              },
              buttonType: 'pay',
              buttonColor: 'black',
              buttonSizeMode: 'fill'
            });
  
            console.log('Tlačítko vytvořeno, vkládám do kontejneru...');
            const container = document.getElementById('google-pay-button-container');
            if (container) {
              container.innerHTML = '';
              container.appendChild(button);
              console.log('Tlačítko Google Pay bylo úspěšně vloženo');
            } else {
              console.error('Kontejner pro Google Pay tlačítko nebyl nalezen');
            }
          } else {
            console.warn('Google Pay není dostupný na tomto zařízení/prohlížeči');
          }
        })
        .catch(function(err) {
          console.error('Chyba při kontrole dostupnosti Google Pay:', err);
        });
    } catch (error) {
      console.error('Chyba při inicializaci Google Pay:', error);
    }
  }

  // Přidejte výpis dostupných platebních metod s více detaily
// Vylepšená funkce pro získání platebních metod s debugovacími informacemi
export async function getPaymentMethods() {
    try {
      const response = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query {
              eligiblePaymentMethods {
                id
                code
                name
                description
                isEligible
                eligibilityMessage
              }
            }
          `
        }),
      });
  
      const data = await response.json();
      
      if (data.errors) {
        console.error('Chyba při získávání platebních metod:', data.errors);
        throw new Error(data.errors[0].message);
      }
      
      console.log('Dostupné platební metody:', JSON.stringify(data.data.eligiblePaymentMethods, null, 2));
      return data.data.eligiblePaymentMethods;
    } catch (error) {
      console.error('Chyba při získávání platebních metod:', error);
      throw error;
    }
  }

  // Nová funkce specificky pro Google Pay platby
// Opravená funkce pro dokončení objednávky po Google Pay platbě
// Kompletně přepracovaná funkce pro dokončení objednávky po Google Pay platbě
// Opravená funkce pro dokončení objednávky po Google Pay platbě
// Kompletně přepracovaná funkce pro dokončení objednávky po Google Pay platbě
// Kompletní přepracování funkce s debugging informacemi
// Úplně nová, zjednodušená verze
// Aktualizace funkce pro platbu Google Pay
export async function completeOrderAfterGooglePay(paymentData: any) {
    try {
      console.log("Dokončuji objednávku po Google Pay platbě");
      
      // 0. Ověř, že existuje aktivní košík
      const orderResponse = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { activeOrder { id, code, state, lines { id } } }`
        })
      });
      
      const orderData = await orderResponse.json();
      
      // Kontrola existence košíku
      if (!orderData.data?.activeOrder?.id || orderData.errors) {
        console.error("Žádný aktivní košík nebyl nalezen:", orderData);
        throw new Error("Nemáte žádný aktivní košík. Přidejte zboží a zkuste to znovu.");
      }
      
      // Kontrola stavu košíku
      console.log("Stav košíku před dokončením:", orderData.data.activeOrder.state);
      
      // 1. Přepni košík do stavu ArrangingPayment (pokud není)
      if (orderData.data.activeOrder.state !== "ArrangingPayment") {
        console.log("Košík není ve stavu ArrangingPayment, přepínám...");
        
        const transitionResponse = await fetch(`${VENDURE_API_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              mutation {
                transitionOrderToState(state: "ArrangingPayment") {
                  ... on Order { id, code, state }
                  ... on ErrorResult { errorCode, message }
                }
              }
            `
          })
        });
        
        const transitionData = await transitionResponse.json();
        console.log("Výsledek přechodu do ArrangingPayment:", transitionData);
        
        if (transitionData.errors || transitionData.data?.transitionOrderToState?.errorCode) {
          console.error("Chyba při přepínání do stavu ArrangingPayment:", 
            transitionData.errors || transitionData.data?.transitionOrderToState);
          throw new Error("Nepodařilo se přepnout košík do stavu pro platbu");
        }
      }
      
      // 2. Přidej platbu metodou googlepay
      console.log("Přidávám platbu Google Pay...");
      
      const paymentResponse = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation {
              addPaymentToOrder(input: {
                method: "googlepay",
                metadata: {}
              }) {
                ... on Order { id, code, state }
                ... on ErrorResult { errorCode, message }
              }
            }
          `
        })
      });
      
      const paymentResult = await paymentResponse.json();
      console.log("Výsledek platby:", paymentResult);
      
      if (paymentResult.errors || paymentResult.data?.addPaymentToOrder?.errorCode) {
        console.error("Chyba při přidání platby:", 
          paymentResult.errors || paymentResult.data?.addPaymentToOrder);
        throw new Error("Nepodařilo se přidat platbu");
      }
      
      // 3. Dokonči objednávku přechodem do PaymentSettled
      console.log("Platba přidána, dokončuji objednávku...");
      
      const settleResponse = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation {
              transitionOrderToState(state: "PaymentSettled") {
                ... on Order { id, code, state }
                ... on ErrorResult { errorCode, message }
              }
            }
          `
        })
      });
      
      const settleData = await settleResponse.json();
      console.log("Výsledek dokončení objednávky:", settleData);
      
      if (settleData.errors || settleData.data?.transitionOrderToState?.errorCode) {
        console.error("Chyba při dokončování objednávky:", 
          settleData.errors || settleData.data?.transitionOrderToState);
        throw new Error("Nepodařilo se dokončit objednávku");
      }
      
      // 4. Vrať výsledek
      return settleData.data.transitionOrderToState;
    } catch (error: any) {
      console.error("Chyba při zpracování Google Pay platby:", error);
      throw error;
    }
}