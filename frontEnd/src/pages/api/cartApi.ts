import { GraphQLClient, gql } from "graphql-request";

const VENDURE_API_URL = "http://localhost:3000/shop-api";

const client = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Získání aktivního košíku
const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      totalQuantity
      subTotal
      subTotalWithTax
      total
      totalWithTax
      lines {
        id
        quantity
        linePriceWithTax
        productVariant {
          id
          name
          price
          priceWithTax
        }
      }
    }
  }
`;



// Přidání položky do košíku
const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        totalQuantity
        totalWithTax
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const TRANSITION_ORDER_TO_STATE = gql`
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
        state
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Odstranění položky z košíku
const REMOVE_ORDER_LINE = gql`
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        totalQuantity
        totalWithTax
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Vylepšená funkce pro zajištění správného stavu objednávky
// Přidejte tuto novou funkci pro zajištění stavu AddingItems
export async function ensureOrderInAddingItemsState() {
    try {
      // Získáme aktuální objednávku
      const activeOrder = await getActiveOrder();
      
      if (!activeOrder) {
        console.log("Žádný aktivní košík nenalezen");
        return null;
      }
      
      // Pokud je v jiném stavu než AddingItems, provedeme transition
      if (activeOrder.state !== 'AddingItems') {
        console.log(`Košík je ve stavu ${activeOrder.state}, přepínám na AddingItems`);
        
        const response = await fetch(`${VENDURE_API_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              mutation {
                transitionOrderToState(state: "AddingItems") {
                  ... on Order {
                    id
                    state
                  }
                  ... on ErrorResult {
                    errorCode
                    message
                  }
                }
              }
            `
          }),
        });
        
        const data = await response.json();
        
        if (data.errors) {
          console.error("Chyba při přepínání stavu:", data.errors);
          throw new Error(data.errors[0].message);
        }
        
        const result = data.data.transitionOrderToState;
        
        if (result.errorCode) {
          console.error("Chyba přechodu:", result.message);
          throw new Error(result.message);
        }
        
        console.log("Košík úspěšně přepnut do stavu AddingItems");
        return result;
      }
      
      console.log("Košík je již ve stavu AddingItems");
      return activeOrder;
    } catch (error) {
      console.error("Chyba při zajišťování stavu AddingItems:", error);
      throw error;
    }
  }

// Vylepšená funkce pro získání aktivního košíku
export async function getActiveOrder() {
    try {
      const response = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            query {
              activeOrder {
                id
                code
                state
                totalQuantity
                subTotal
                subTotalWithTax
                total
                totalWithTax
                lines {
                  id
                  quantity
                  linePriceWithTax
                  productVariant {
                    id
                    name
                    price
                    priceWithTax
                  }
                }
              }
            }
          `
        }),
      });
  
      const data = await response.json();
      
      if (data.errors) {
        console.error('Chyba při získávání aktivní objednávky:', data.errors);
        return null; // Vrátíme null, pokud je chyba - třeba neexistující košík
      }
      
      return data.data.activeOrder; // Může být null, pokud není aktivní objednávka
    } catch (error) {
      console.error('Chyba při získávání aktivní objednávky:', error);
      return null; // Vrátíme null, pokud je chyba, aby frontend mohl správně reagovat
    }
  }

  export async function addItemToOrder(productVariantId:any, quantity = 1) {
    try {
      // First ensure the order is in the correct state
      await ensureOrderInAddingItemsState();
      
      const variables = {
        productVariantId,
        quantity
      };
      const data:any = await client.request(ADD_ITEM_TO_ORDER, variables);
      return data.addItemToOrder;
    } catch (error) {
      console.error("Chyba při přidávání do košíku:", error);
      throw error;
    }
  }


// Přidejte do cartApi.ts
export async function resetOrderToAddingItems() {
  try {
    console.log("Resetuji stav objednávky do AddingItems");
    
    // Nejprve zjistíme aktuální stav objednávky
    const currentOrder = await getActiveOrder();
    
    if (!currentOrder) {
      console.log("Nenalezena žádná aktivní objednávka");
      return { success: false, error: "Není aktivní objednávka" };
    }
    
    console.log(`Aktuální stav objednávky: ${currentOrder.state}`);
    
    // Pokud je již ve stavu AddingItems, není třeba nic dělat
    if (currentOrder.state === 'AddingItems') {
      return { success: true, message: "Již ve stavu AddingItems" };
    }
    
    // Pokusíme se přejít do stavu AddingItems
    const response = await fetch("http://localhost:3000/shop-api", {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            transitionOrderToState(state: "AddingItems") {
              ... on Order {
                id
                state
              }
              ... on OrderStateTransitionError {
                errorCode
                message
                transitionError
              }
              ... on ErrorResult {
                errorCode
                message
              }
            }
          }
        `
      })
    });
    
    const result = await response.json();
    console.log("Výsledek přechodu do stavu AddingItems:", result);
    
    if (result.errors) {
      console.error("GraphQL chyby:", result.errors);
      return { 
        success: false, 
        error: result.errors[0]?.message || "Chyba při přechodu stavu" 
      };
    }
    
    if (result.data?.transitionOrderToState?.errorCode) {
      return { 
        success: false, 
        error: result.data.transitionOrderToState.message 
      };
    }
    
    return { 
      success: true, 
      message: "Stav úspěšně resetován na AddingItems" 
    };
  } catch (error) {
    console.error("Chyba při resetování stavu objednávky:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Neznámá chyba"
    };
  }
}

// Aktualizujte funkci pro odstranění položky z košíku
// Aktualizujte funkci pro odstranění položky
export async function removeOrderLine(orderLineId: string) {
    try {
      // Nejprve se ujistíme, že košík je ve stavu AddingItems
      await ensureOrderInAddingItemsState();
      
      // Nyní můžeme odstranit položku
      const response = await fetch(`${VENDURE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation {
              removeOrderLine(orderLineId: "${orderLineId}") {
                ... on Order {
                  id
                  totalQuantity
                  totalWithTax
                  lines {
                    id
                    quantity
                    linePriceWithTax
                    productVariant {
                      id
                      name
                      price
                      priceWithTax
                    }
                  }
                }
                ... on ErrorResult {
                  errorCode
                  message
                }
              }
            }
          `
        }),
      });
  
      const data = await response.json();
      
      if (data.errors) {
        console.error('Chyba při odstraňování položky:', data.errors);
        throw new Error(data.errors[0].message);
      }
      
      return data.data.removeOrderLine;
    } catch (error) {
      console.error('Chyba při odstraňování položky z košíku:', error);
      throw error;
    }
  }