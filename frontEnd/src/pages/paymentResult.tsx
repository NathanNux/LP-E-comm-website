import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

export default function PaymentResult() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Zpracováváme výsledek vaší platby...');
  
  useEffect(() => {
    // Počkáme až budou parametry dostupné
    if (!router.isReady) return;
    
    const { result, code, message: errorMessage } = router.query;
    
    // GP webpay vrací výsledek přímo v URL parametrech
    if (result === 'success') {
      setStatus('success');
      setMessage(`Platba byla úspěšně dokončena. Děkujeme za váš nákup! Číslo objednávky: ${code}`);
      
      // Zobrazíme toast
      toast.success('Platba byla úspěšně zpracována');
      
      // Přesměrování po úspěšné platbě
      setTimeout(() => {
        router.push('/');
      }, 5000);
    } else {
      setStatus('error');
      setMessage(errorMessage as string || 'Platba nebyla dokončena nebo byla zamítnuta.');
      
      // Zobrazíme toast
      toast.error('Platba nebyla úspěšně dokončena');
    }
  }, [router.isReady, router.query]);
  
  return (
    <div className="payment-result-container">
      <h1>Výsledek platby</h1>
      
      {status === 'loading' && (
        <div className="loading">
          <div className="spinner"></div>
          <p>{message}</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="success">
          <h2>Platba byla úspěšná</h2>
          <p>{message}</p>
          <p>Za 5 sekund budete přesměrováni zpět do obchodu.</p>
          <button onClick={() => router.push('/')}>
            Zpět do obchodu
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error">
          <h2>Chyba platby</h2>
          <p>{message}</p>
          <button onClick={() => router.push('/')}>
            Zpět do obchodu
          </button>
        </div>
      )}
      
      <style jsx>{`
        .payment-result-container {
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          text-align: center;
        }
        .loading, .success, .error {
          margin: 30px 0;
          padding: 20px;
          border-radius: 5px;
        }
        .success {
          background-color: #e6f7e6;
          border: 1px solid #b8e6b8;
        }
        .error {
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin: 0 auto 20px;
        }
        button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}