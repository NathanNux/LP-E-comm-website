import { GraphQLClient, gql } from "graphql-request";

// URL tvého Vendure GraphQL API
const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL);

const GET_USER_PROFILE = gql`
  query GetUserProfile {
    me {
      id
      firstName
      lastName
      email
    }
  }
`;

export async function getUserInfo() {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Uživatel není přihlášen.");
  }

  client.setHeader("Authorization", `Bearer ${accessToken}`);

  try {
    const data:any = await client.request(GET_USER_PROFILE);
    return data.me;
  } catch (error) {
    console.error("Chyba při získávání profilových informací:", error);
    throw new Error("Nelze získat profil.");
  }
}
