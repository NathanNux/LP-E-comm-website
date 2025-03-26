import { gql, GraphQLClient } from 'graphql-request';

const VENDURE_API_URL = 'http://localhost:3000/shop-api';
const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
});

// GraphQL mutace pro vytvoření GoPay platby
const ADD_GOPAY_PAYMENT = gql`
  mutation AddGopayPayment {
    addPaymentToOrder(input: {
      method: "gopay",
      metadata: {}
    }) {
      ... on Order {
        id
        code
        state
        totalWithTax
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
`;

// Funkce pro vytvoření GoPay platby
export async function createGopayPayment() {
  try {
    const response = await fetch('/api/gopay/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při vytváření GoPay platby');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chyba při vytváření GoPay platby:', error);
    throw error;
  }
}

// Funkce pro přidání GoPay platby do objednávky
export async function addGopayPaymentToOrder() {
  try {
    const data:any = await client.request(ADD_GOPAY_PAYMENT);
    
    if (data.addPaymentToOrder.errorCode) {
      throw new Error(data.addPaymentToOrder.message);
    }
    
    return {
      success: true,
      order: data.addPaymentToOrder,
      paymentUrl: data.addPaymentToOrder.payments[0]?.metadata?.paymentUrl
    };
  } catch (error) {
    console.error('Chyba při přidávání GoPay platby:', error);
    throw error;
  }
}

// Funkce pro zpracování výsledku platby
export async function processGopayPaymentResult(id:any, result:any) {
  try {
    const response = await fetch('/api/gopay/process-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ id, result }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při zpracování výsledku platby');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chyba při zpracování výsledku GoPay platby:', error);
    throw error;
  }
}