import { GraphQLClient, gql } from "graphql-request";

// URL tvého Vendure GraphQL API (backend)
const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL);

// GraphQL dotaz pro hledání produktů podle jména
const GET_PRODUCT_BY_NAME = gql`
  query GetProductByName($term: String!) {
    products(options: { filter: { name: { contains: $term } } }) {
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

// Funkce pro hledání produktu podle jména
export async function fetchProductByName(name: string) {
  try {
    const data:any = await client.request(GET_PRODUCT_BY_NAME, { term: name });
    return data.products.items;
  } catch (error) {
    console.error("Chyba při hledání produktu:", error);
    return [];
  }
}
