import { NextApiRequest, NextApiResponse } from 'next';
import { gql, GraphQLClient } from 'graphql-request';

const VENDURE_API_URL = 'http://localhost:3000/shop-api';
const client = new GraphQLClient(VENDURE_API_URL, {
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
    });

// GraphQL mutace pro dokončení objednávky
const TRANSITION_TO_PAYMENT_SETTLED = gql`
  mutation {
    transitionOrderToState(state: "PaymentSettled") {
      ... on Order {
        id
        code
        state
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metoda není povolena' });
  }

  const { id, result } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Chybí ID platby' });
  }

  try {
    // Pokud je platba úspěšná, dokončíme objednávku
    if (result === 'PAID') {
      const data:any = await client.request(TRANSITION_TO_PAYMENT_SETTLED);
      
      if (data.transitionOrderToState.errorCode) {
        return res.status(400).json({ 
          success: false,
          message: data.transitionOrderToState.message 
        });
      }
      
      return res.status(200).json({ 
        success: true,
        orderCode: data.transitionOrderToState.code,
        state: data.transitionOrderToState.state
      });
    } else {
      return res.status(200).json({ 
        success: false,
        message: 'Platba nebyla dokončena nebo byla zamítnuta'
      });
    }
  } catch (error:any) {
    console.error('Chyba při zpracování výsledku GoPay platby:', error);
    return res.status(500).json({ message: error.message || 'Chyba při zpracování výsledku platby' });
  }
}