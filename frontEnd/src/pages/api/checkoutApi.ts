import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
export async function transitionOrderToArrangingPayment() {
  try {
    const response = await fetch(`${VENDURE_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation {
            transitionOrderToState(state: "ArrangingPayment") {
              ... on Order {
                id
                state
              }
              ... on OrderStateTransitionError {
                errorCode
                message
                transitionError
                fromState
                toState
              }
            }
          }
        `
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }
    
    return data.data.transitionOrderToState;
  } catch (error) {
    console.error('Chyba při přepnutí objednávky do stavu platby:', error);
    throw error;
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

export async function addCashOnDeliveryPayment() {
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
    
    if (data.errors) {
      console.error("GraphQL chyby při přidávání platby dobírkou:", data.errors);
      return {
        errorCode: 'GRAPHQL_ERROR',
        message: data.errors.map((e: any) => e.message).join(', ')
      };
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