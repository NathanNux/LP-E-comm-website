import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include', // Důležité pro předávání cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
    }
  }
`;

export async function getUserInfo() {
  try {
    const data:any = await client.request(GET_CURRENT_USER);
    console.log("Data o uživateli:", data);
    return data.activeCustomer;
  } catch (error) {
    console.error("Chyba při získávání informací o uživateli:", error);
    throw error;
  }
}