// Upravený GraphQL dotaz pro získání více informací o produktech
import { gql, GraphQLClient} from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});
export async function fetchProducts() {
  const query = gql`
    query {
      products {
        items {
          id
          name
          slug
          description
          featuredAsset {
            preview
          }
          variants {
            id
            name
            stockLevel
            price
            priceWithTax
          }
        }
      }
    }
  `;

  try {
    const data:any = await client.request(query);
    
    // Transformace dat pro snadnější použití ve frontend komponentách
    const transformedProducts = data.products.items.map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      // Odstranění HTML tagů z popisu
      description: product.description?.replace(/<\/?p>/g, '') || '',
      featuredAsset: product.featuredAsset,
      // Použijeme první variantu jako výchozí
      price: product.variants[0]?.price || 0,
      priceWithTax: product.variants[0]?.priceWithTax || 0,
      stockLevel: product.variants[0]?.stockLevel || 0,
      variantId: product.variants[0]?.id || null,
    }));
    
    return transformedProducts;
  } catch (error) {
    console.error("Chyba při načítání produktů:", error);
    return [];
  }
}