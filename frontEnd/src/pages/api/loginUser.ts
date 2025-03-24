import { GraphQLClient, gql } from "graphql-request";

// URL tvého Vendure GraphQL API
const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL);

// GraphQL dotaz pro přihlášení uživatele
const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      accessToken
      refreshToken
    }
  }
`;

// Funkce pro přihlášení
export async function loginUser(email: string, password: string) {
  try {
    const response:any = await client.request(LOGIN_USER, { email, password });
    const { accessToken, refreshToken } = response.login;
    // Uložení tokenů do localStorage nebo cookies pro následné používání
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Chyba při přihlášení:", error);
    throw new Error("Neplatné přihlašovací údaje.");
  }
}
