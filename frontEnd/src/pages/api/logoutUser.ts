import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

const LOGOUT = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

export async function logoutUser() {
  try {
    const data:any = await client.request(LOGOUT);
    return data.logout;
  } catch (error) {
    console.error("Chyba při odhlášení:", error);
    throw error;
  }
}