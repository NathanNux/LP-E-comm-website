import { GraphQLClient, gql } from "graphql-request";
import { getUserInfo } from './getUserInfo';

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Přidat do existujícího souboru

// Přidat do existujícího souboru

// Funkce pro přidání GoPay platby
// Upravit funkci pro GoPay platbu

// Funkce pro přidání GoPay platby
// Nahraďte stávající funkci addGopayPayment

export async function addGopayPayment() {
  try {
    console.log("Přidávám platbu přes GoPay");
    
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            addPaymentToOrder(input: {
              method: "czech-payment-method",
              metadata: { paymentMethod: "gopay" }
            }) {
              ... on Order {
                id
                code
                state
                payments {
                  id
                  amount
                  state
                  metadata
                }
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });

    const data = await response.json();
    console.log("Odpověď z GoPay platby:", data);
    
    if (data.errors) {
      console.error("GraphQL chyby:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    if (data.data.addPaymentToOrder.errorCode) {
      return data.data.addPaymentToOrder;
    }
    
    // Získáme URL pro přesměrování na platební bránu
    const paymentUrl = data.data.addPaymentToOrder.payments[0]?.metadata?.paymentUrl;
    
    if (!paymentUrl) {
      return {
        errorCode: 'NO_PAYMENT_URL',
        message: 'Chybí URL pro přesměrování na platební bránu'
      };
    }
    
    return {
      success: true,
      paymentUrl,
      order: data.data.addPaymentToOrder
    };
  } catch (error: any) {
    console.error("Chyba při přidávání GoPay platby:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || "Chyba při přidávání GoPay platby"
    };
  }
}

// ...existing code...

// Funkce pro propojení objednávky s aktuálním zákazníkem
// ...existing code...

export async function setCustomerForOrder(firstName?: string, lastName?: string, email?: string) {
  try {
    console.log("Začínám nastavovat zákazníka pro objednávku");
    
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            setCustomerForOrder(
              input: {
                emailAddress: "${email || ''}",
                firstName: "${firstName || ''}",
                lastName: "${lastName || ''}"
              }
            ) {
              ... on Order {
                id
                customer {
                  id
                  firstName
                  lastName
                  emailAddress
                }
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });

    const data = await response.json();
    console.log("Odpověď setCustomerForOrder:", data);
    
    if (data.errors) {
      console.error("GraphQL chyby při nastavování zákazníka:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    // Oprava - použijeme správný název odpovědi
    if (data.data.setCustomerForOrder && data.data.setCustomerForOrder.errorCode) {
      // Speciální případ - když je uživatel již přihlášen
      if (data.data.setCustomerForOrder.errorCode === 'ALREADY_LOGGED_IN_ERROR') {
        console.log("Uživatel je již přihlášen, objednávka již má přiřazeného zákazníka");
        return { success: true }; // Vrátíme úspěch, protože zákazník už je nastaven
      }
      return data.data.setCustomerForOrder;
    }
    
    return data.data.setCustomerForOrder || { success: true };
  } catch (error: any) {
    console.error("Chyba při nastavování zákazníka pro objednávku:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || "Chyba při nastavování zákazníka"
    };
  }
}

// Přidat adresu doručení (nutné před nastavením doručovací metody)
const SET_SHIPPING_ADDRESS = gql`
  mutation SetShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      __typename
      ... on Order {
        id
        code
        state
        shippingAddress {
          fullName
          streetLine1
          city
          postalCode
          countryCode
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Získat dostupné doručovací metody
const GET_SHIPPING_METHODS = gql`
  query GetShippingMethods {
    eligibleShippingMethods {
      id
      name
      code
      description
      price
      priceWithTax
    }
  }
`;

// Nastavit doručovací metodu
const SET_SHIPPING_METHOD = gql`
  mutation SetShippingMethod($shippingMethodId: ID!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        code
        state
        shippingWithTax
        totalWithTax
        shippingLines {
          shippingMethod {
            id
            name
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Získání dostupných platebních metod
const GET_PAYMENT_METHODS = gql`
  query GetPaymentMethods {
    eligiblePaymentMethods {
      id
      name
      code
      description
      isEligible
      eligibilityMessage
    }
  }
`;

// Přidání platby
const ADD_PAYMENT = gql`
  mutation AddPayment($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Dokončení objednávky
const COMPLETE_ORDER = gql`
  mutation CompleteOrder {
    transitionOrderToState(state: "ArrangingPayment") {
      ... on Order {
        id
        code
        state
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Alternativní dotaz pro nastavení doručovací metody
const SET_SHIPPING_METHOD_ALT = gql`
  mutation ($shippingMethodId: ID!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        state
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Získání aktivního košíku s detaily
export async function getDetailedCart() {
  const GET_DETAILED_CART = gql`
    query {
      activeOrder {
        id
        code
        state
        lines {
          id
          quantity
          productVariant {
            name
          }
        }
        shippingAddress {
          fullName
          streetLine1
          city
          postalCode
          countryCode
        }
      }
    }
  `;

  try {
    const data:any = await client.request(GET_DETAILED_CART);
    return data.activeOrder;
  } catch (error) {
    console.error("Chyba při získávání detailů košíku:", error);
    throw error;
  }
}

export async function getDetailedShippingMethods() {
  const GET_DETAILED_SHIPPING_METHODS = gql`
    query {
      eligibleShippingMethods {
        id
        name
        code
        description
        price
        priceWithTax
      }
    }
  `;

  try {
    const data:any = await client.request(GET_DETAILED_SHIPPING_METHODS);
    return data.eligibleShippingMethods;
  } catch (error) {
    console.error("Chyba při získávání detailů doručovacích metod:", error);
    throw error;
  }
}

export async function testSetShippingMethod(shippingMethodId: string) {
  const TEST_SET_SHIPPING_METHOD = gql`
    mutation SetShippingMethod($shippingMethodId: ID!) {
      setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
        __typename
        ... on Order {
          id
          code
          state
          shippingWithTax
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;

  try {
    const data:any = await client.request(TEST_SET_SHIPPING_METHOD, { shippingMethodId });
    return data.setOrderShippingMethod;
  } catch (error: any) {
    console.error("Chyba při testování nastavení doručovací metody:", error);
    
    // Podrobnější diagnostika GraphQL chyby
    if (error.response?.errors) {
      console.error("GraphQL chyby:", error.response.errors);
    }
    
    // Vytvoření strukturovaného objektu s chybou pro lepší debugování
    return {
      error: true,
      message: error.message,
      details: error.response?.errors || [],
    };
  }
}

// Alternativní způsob nastavení doručovací metody
export async function setShippingMethodAlternative(shippingMethodId: string) {
  try {
    console.log("Alternativní nastavení doručovací metody s ID:", shippingMethodId);
    
    const data:any = await client.request(SET_SHIPPING_METHOD_ALT, { shippingMethodId });
    console.log("Odpověď z alternativního dotazu:", data);
    
    if (data.setOrderShippingMethod?.errorCode) {
      return {
        error: true,
        errorCode: data.setOrderShippingMethod.errorCode,
        message: data.setOrderShippingMethod.message
      };
    }
    
    return {
      success: true,
      order: data.setOrderShippingMethod
    };
  } catch (error: any) {
    console.error("Chyba při alternativním nastavení doručovací metody:", error);
    return {
      error: true,
      message: error.message || "Neznámá chyba"
    };
  }
}

export async function setShippingAddress(address: {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
}) {
  try {
    console.log("Nastavuji adresu doručení:", address);
    
    // Ujistěte se, že countryCode je správně zadán
    if (!address.countryCode) {
      address.countryCode = 'CZ';
    }
    
    const data:any = await client.request(SET_SHIPPING_ADDRESS, { input: address });
    console.log("Odpověď při nastavení adresy:", data);
    
    if (data.setOrderShippingAddress.errorCode) {
      return {
        errorCode: data.setOrderShippingAddress.errorCode,
        message: data.setOrderShippingAddress.message
      };
    }
    
    return {
      success: true,
      order: data.setOrderShippingAddress
    };
  } catch (error: any) {
    console.error("Chyba při nastavení adresy:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || 'Neznámá chyba při nastavení adresy'
    };
  }
}

export async function getShippingMethods() {
  try {
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            eligibleShippingMethods {
              id
              name
              code
              description
              price
              priceWithTax
            }
          }
        `
      })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error("GraphQL chyby:", data.errors);
      return [];
    }
    
    return data.data.eligibleShippingMethods;
  } catch (error) {
    console.error("Chyba při získávání doručovacích metod:", error);
    return [];
  }
}



// Nahraďte GraphQLClient implementaci použitím přímého fetch
// Nahradit stávající implementaci setShippingMethod
export async function setShippingMethod(shippingMethodId: string) {
  try {
    console.log("Nastavuji doručovací metodu s ID:", shippingMethodId);
    
    // Použití přímého fetch místo GraphQL klienta
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            setOrderShippingMethod(shippingMethodId: "${shippingMethodId}") {
              ... on Order {
                id
                code
                state
                shippingWithTax
                totalWithTax
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log("Odpověď API při nastavení doručovací metody:", data);
    
    if (!response.ok) {
      console.error("HTTP chyba:", response.status, response.statusText);
      return {
        errorCode: 'HTTP_ERROR',
        message: `HTTP chyba ${response.status}: ${response.statusText}`
      };
    }
    
    if (data.errors) {
      console.error("GraphQL chyby:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    return data.data.setOrderShippingMethod;
  } catch (error: any) {
    console.error("Chyba při nastavení doručovací metody:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || "Chyba při nastavení doručovací metody"
    };
  }
}

// Funkce pro nastavení správného stavu objednávky
export async function transitionOrderToAddingState() {
  try {
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            transitionOrderToState(state: "AddingItems") {
              ... on Order {
                id
                state
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log("Výsledek přechodu do stavu AddingItems:", data);
    
    if (data.errors) {
      return {
        success: false,
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    if (data.data.transitionOrderToState.errorCode) {
      return {
        success: false,
        message: data.data.transitionOrderToState.message
      };
    }
    
    return {
      success: true,
      state: data.data.transitionOrderToState.state
    };
  } catch (error: any) {
    console.error("Chyba při přechodu do stavu AddingItems:", error);
    return {
      success: false,
      message: error.message || "Neznámá chyba"
    };
  }
}

export async function getPaymentMethods() {
  try {
    const data:any = await client.request(GET_PAYMENT_METHODS);
    return data.eligiblePaymentMethods;
  } catch (error) {
    console.error("Chyba při získávání platebních metod:", error);
    throw error;
  }
}

export async function addPayment(method: string, metadata?: any) {
  try {
    const input = {
      method,
      metadata: metadata || {},
    };
    const data:any = await client.request(ADD_PAYMENT, { input });
    return data.addPaymentToOrder;
  } catch (error) {
    console.error("Chyba při přidání platby:", error);
    throw error;
  }
}

// Přidejte novou funkci pro transition do stavu pro platbu
// Přidejte novou funkci pro transition do stavu pro platbu
// Přidejte novou funkci pro transition do stavu pro platbu
// Přidejte opravenou funkci pro transition do stavu pro platbu
// Nahraďte stávající funkci transitionOrderToArrangingPayment touto verzí
// Nahraďte aktuální funkci transitionOrderToArrangingPayment

// Nahraďte stávající funkci transitionOrderToArrangingPayment

// Nahraďte stávající funkci:

// Nahraďte stávající funkci

export async function transitionOrderToArrangingPayment() {
  // Tato proměnná zabrání duplicitním voláním
  const requestId = Date.now().toString();
  
  try {
    console.log(`Začínám přechod do stavu ArrangingPayment (request ID: ${requestId})`);
    
    // Uděláme až 3 pokusy o přechod do stavu ArrangingPayment
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Pokus #${attempt} o přechod do stavu ArrangingPayment`);
      
      const response = await fetch(VENDURE_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId, // Pro zabránění duplicitním požadavkům
        },
        body: JSON.stringify({
          query: `
            mutation {
              transitionOrderToState(state: "ArrangingPayment") {
                ... on Order {
                  id
                  code
                  state
                }
                ... on OrderStateTransitionError {
                  errorCode
                  message
                  transitionError
                  fromState
                  toState
                }
                ... on ErrorResult {
                  errorCode
                  message
                }
              }
            }
          `
        })
      });

      const data = await response.json();
      console.log(`Pokus #${attempt}: Odpověď z přechodu do stavu platby:`, data);
      
      // Pokud přechod byl úspěšný nebo chyba není způsobena stavem, vrátíme výsledek
      if (!data.errors && !data.data?.transitionOrderToState?.errorCode) {
        console.log("Přechod do stavu platby byl úspěšný");
        return data.data.transitionOrderToState;
      }
      
      if (data.data?.transitionOrderToState?.errorCode === 'ORDER_STATE_TRANSITION_ERROR') {
        // Pokud je chyba "už jsme v cílovém stavu", považujeme to za úspěch
        if (data.data.transitionOrderToState.fromState === 'ArrangingPayment') {
          console.log("Objednávka je již ve stavu ArrangingPayment");
          return {
            state: 'ArrangingPayment',
            id: data.data.transitionOrderToState.id || ''
          };
        }
        
        // Jinak se pokusíme o reset stavu
        console.log("Pokusím se o stabilizaci stavu před dalším pokusem");
        await ensureStableOrderState();
        
        // Přidejme krátkou pauzu před dalším pokusem
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        // Jiná chyba, vrátíme ji
        console.log("Nepřekonatelná chyba při přechodu do stavu platby", data.errors || data.data?.transitionOrderToState);
        return data.data?.transitionOrderToState || {
          errorCode: 'GRAPHQL_ERROR',
          message: data.errors?.map((e:any) => e.message).join(', ') || 'Neznámá chyba'
        };
      }
    }
    
    // Pokud jsme sem došli, ani jeden pokus nebyl úspěšný
    return {
      errorCode: 'MAX_ATTEMPTS_REACHED',
      message: 'Nepodařilo se přejít do stavu platby ani po třech pokusech'
    };
  } catch (error:any) {
    console.error(`Chyba při přechodu do stavu platby (request ID: ${requestId}):`, error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || 'Neznámá chyba při přechodu do stavu platby'
    };
  }
}
// Přidejte novou funkci pro stabilizaci stavu objednávky

export async function ensureStableOrderState() {
  try {
    console.log("Stabilizuji stav objednávky před pokračováním");
    
    // 1. Nejprve diagnostikujeme aktuální stav
    const diagnosisResult = await diagnoseOrderState();
    console.log("Diagnostika stavu objednávky:", diagnosisResult);
    
    // 2. Pokud objednávka není v AddingItems, pokusíme se ji vrátit do toho stavu
    if (diagnosisResult.success && diagnosisResult.order.state !== 'AddingItems') {
      console.log("Objednávka není ve stavu AddingItems, pokusím se o reset");
      
      const resetResponse = await fetch(VENDURE_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation {
              transitionOrderToState(state: "AddingItems") {
                ... on Order {
                  id
                  state
                }
                ... on ErrorResult {
                  errorCode
                  message
                }
              }
            }
          `
        })
      });
      
      const resetData = await resetResponse.json();
      console.log("Výsledek resetu do stavu AddingItems:", resetData);
    }
    
    return true;
  } catch (error) {
    console.error("Chyba při stabilizaci stavu objednávky:", error);
    return false;
  }
}

// Úprava completeOrder funkce pro zajištění aktualizace skladu
// Upravená funkce completeOrder - přejde do správného stavu
export async function completeOrder() {
  try {
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            addPaymentToOrder(input: {
              method: "cash-on-delivery",
              metadata: {}
            }) {
              ... on Order {
                id
                code
                state
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log("Výsledek přidání platby:", data);
    
    if (data.errors) {
      console.error("GraphQL chyby při přidání platby:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    if (data.data.addPaymentToOrder.errorCode) {
      return data.data.addPaymentToOrder;
    }
    
    // Nyní dokončíme objednávku
    const completeResponse = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            transitionOrderToState(state: "PaymentSettled") {
              ... on Order {
                id
                code
                state
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });
    
    const completeData = await completeResponse.json();
    console.log("Výsledek dokončení objednávky:", completeData);
    
    if (completeData.errors) {
      console.error("GraphQL chyby při dokončování objednávky:", completeData.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: completeData.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    return completeData.data.transitionOrderToState;
  } catch (error: any) {
    console.error("Chyba při dokončování objednávky:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || "Chyba při dokončování objednávky"
    };
  }
}

// Nahraďte stávající addCashOnDeliveryPayment

export async function addCashOnDeliveryPayment() {
  try {
    console.log("Přidávám platbu dobírkou");
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            addPaymentToOrder(input: { method: "cash-on-delivery", metadata: {} }) {
              ... on Order {
                id
                code
                state
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });

    const data = await response.json();
    console.log("Odpověď z platby dobírkou:", data);
    
    if (data.errors) {
      console.error("GraphQL chyby:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    // Pokud je platba úspěšně přidána, automaticky dokončíme objednávku
    if (!data.data.addPaymentToOrder.errorCode) {
      const settleResponse = await fetch(VENDURE_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation {
              transitionOrderToState(state: "PaymentSettled") {
                ... on Order {
                  id
                  code
                  state
                }
                ... on ErrorResult {
                  errorCode
                  message
                }
              }
            }
          `
        })
      });
      
      const settleData = await settleResponse.json();
      console.log("Výsledek dokončení objednávky:", settleData);
      
      // Vracíme původní objednávku pro zachování kompatibility
      return data.data.addPaymentToOrder;
    }
    
    return data.data.addPaymentToOrder;
  } catch (error: any) {
    console.error("Chyba při přidávání platby dobírkou:", error);
    return {
      errorCode: 'API_ERROR',
      message: error.message || "Chyba při přidávání platby dobírkou"
    };
  }
}

export async function verifyOrderBeforePayment() {
  try {
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            activeOrder {
              id
              code
              state
              customer {
                id
                emailAddress
              }
              shippingAddress {
                fullName
                streetLine1
                city
                postalCode
              }
              shippingLines {
                shippingMethod {
                  id
                  name
                }
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log("Aktuální stav objednávky před platbou:", data);
    
    if (data.errors) {
      return {
        success: false,
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    const order = data.data.activeOrder;
    
    // Kontrola, zda jsou nastaveny všechny potřebné údaje
    const hasShippingAddress = Boolean(
      order?.shippingAddress?.fullName && 
      order?.shippingAddress?.streetLine1 && 
      order?.shippingAddress?.city
    );
    
    const hasShippingMethod = Boolean(order?.shippingLines && order?.shippingLines.length > 0);
    const hasCustomer = Boolean(order?.customer?.id);
    
    return {
      success: hasShippingAddress && hasShippingMethod && hasCustomer,
      order: order,
      issues: {
        shippingAddress: !hasShippingAddress,
        shippingMethod: !hasShippingMethod,
        customer: !hasCustomer
      }
    };
  } catch (error) {
    console.error("Chyba při ověřování stavu objednávky:", error);
    return {
      success: false,
      message: "Chyba při ověřování stavu objednávky"
    };
  }
}


// Přidat na konec souboru
// Nahraďte stávající diagnoseOrderState

// Nahraďte stávající funkci diagnoseOrderState pro lepší detekci problémů

export async function diagnoseOrderState() {
  try {
    console.log("Provádím diagnostiku stavu objednávky");
    const response = await fetch(VENDURE_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            activeOrder {
              id
              code
              state
              customer { 
                id 
                emailAddress
                firstName
                lastName
              }
              shippingAddress { 
                fullName 
                streetLine1 
                city 
                postalCode 
                countryCode 
              }
              shippingLines { 
                shippingMethod { 
                  id 
                  name 
                } 
              }
              lines { 
                id 
                quantity 
                productVariant { 
                  id 
                  name 
                } 
              }
              payments {
                id
                amount
                state
                method
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    console.log("Diagnostika stavu objednávky - surová data:", data);
    
    if (data.errors) {
      return {
        success: false,
        message: data.errors.map((e: any) => e.message).join(', ')
      };
    }
    
    const order = data.data?.activeOrder;
    if (!order) {
      return {
        success: false,
        message: "Není aktivní objednávka"
      };
    }
    
    // Kontrola podmínek pro přechod do stavu ArrangingPayment
    const hasCustomer = Boolean(order.customer?.id);
    const hasShippingAddress = Boolean(order.shippingAddress?.fullName && order.shippingAddress?.streetLine1);
    const hasShippingMethod = Boolean(order.shippingLines && order.shippingLines.length > 0);
    const hasItems = Boolean(order.lines && order.lines.length > 0);
    
    return {
      success: true,
      order: order,
      readyForPayment: hasCustomer && hasShippingAddress && hasShippingMethod && hasItems,
      issues: {
        customer: !hasCustomer,
        shippingAddress: !hasShippingAddress,
        shippingMethod: !hasShippingMethod,
        items: !hasItems
      }
    };
  } catch (error: any) {
    console.error("Chyba při diagnostice stavu objednávky:", error);
    return {
      success: false,
      message: error.message || "Neznámá chyba při diagnostice"
    };
  }
}