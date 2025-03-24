import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Použijeme jednodušší mutaci bez fragmentů
export const REGISTER_CUSTOMER = gql`
  mutation RegisterAccount($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      __typename
      ... on Success {
        success
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export async function registerUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    // Validace vstupu
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Všechna pole jsou povinná');
    }

    if (password.length < 8) {
      throw new Error('Heslo musí mít alespoň 8 znaků');
    }

    // Ujistíme se, že email má správný formát
    if (!email.includes('@') || !email.includes('.')) {
      throw new Error('Zadejte platnou e-mailovou adresu');
    }

    const variables = {
      input: {
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName
      }
    };

    console.log('Odesílám požadavek s proměnnými:', JSON.stringify(variables));
    
    const response = await client.request(REGISTER_CUSTOMER, variables);
    console.log('Odpověď ze serveru:', response);
    
    return response;
  } catch (error: any) {
    console.error("Chyba při registraci:", error);
    throw error;
  }
}