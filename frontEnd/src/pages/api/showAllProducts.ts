import { GraphQLClient, gql } from "graphql-request";

// URL tvého Vendure GraphQL API (backend)
const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL);

// GraphQL dotaz na získání všech produktů
const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      items {
        id
        name
        slug
        description
        featuredAsset {
          preview
        }
      }
    }
  }
`;

// Funkce pro získání produktů
export async function fetchProducts() {
  try {
    const data : any = await client.request(GET_PRODUCTS);
    return data.products.items;
  } catch (error) {
    console.error("Chyba při načítání produktů:", error);
    return [];
  }
}
