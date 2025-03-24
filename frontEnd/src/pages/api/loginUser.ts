import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include', // Důležité pro ukládání cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(username: $email, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export async function loginUser(email: string, password: string) {
  try {
    const variables = {
      email,
      password
    };

    const response:any = await client.request(LOGIN_MUTATION, variables);
    console.log("Přihlášení - odpověď:", response);
    
    if (response.login.id) {
      // Úspěšné přihlášení
      return { success: true, user: response.login };
    } else {
      // Neúspěšné přihlášení
      throw new Error(response.login.message || 'Přihlášení se nezdařilo');
    }
  } catch (error) {
    console.error("Chyba při přihlášení:", error);
    throw error;
  }
}