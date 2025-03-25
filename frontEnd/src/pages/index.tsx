import { useEffect, useState } from "react";
import { initGooglePay, completeOrderAfterGooglePay } from './api/googlePay';
import { fetchProducts } from "./api/showAllProducts";
import { fetchProductByName } from "./api/showProductByName";
import { loginUser } from "./api/loginUser";
import { getUserInfo } from "./api/getUserInfo";
import { registerUser } from "./api/registerUser";
import toast, { Toaster } from 'react-hot-toast';
import { logoutUser } from "./api/logoutUser";
import { getActiveOrder, ensureOrderInAddingItemsState, addItemToOrder, removeOrderLine } from "./api/cartApi";
import { getShippingMethods, addCashOnDeliveryPayment, getPaymentMethods, setShippingMethod, addPayment, completeOrder, transitionOrderToArrangingPayment } from "./api/checkoutApi";


// Definice typů pro správnou typovou kontrolu
interface User {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  priceWithTax: number;
}

interface OrderLine {
  id: string;
  quantity: number;
  linePriceWithTax: number;
  productVariant: ProductVariant;
}

interface Cart {
  id: string;
  code: string;
  state: string;
  totalQuantity: number;
  subTotal: number;
  subTotalWithTax: number;
  total: number;
  totalWithTax: number;
  lines: OrderLine[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  priceWithTax: number;
  stockLevel: string;
  variantId: string;
  featuredAsset?: {
    preview: string;
  };
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  priceWithTax: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  code: string;
}

export default function Home() {

  //stavy pro checkout
  const [isCheckout, setIsCheckout] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [checkoutStep, setCheckoutStep] = useState('address'); // address, shipping, payment, summary
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    streetLine1: '',
    streetLine2: '',
    city: '',
    postalCode: '',
    countryCode: 'CZ', // Výchozí hodnota pro Českou republiku
    phoneNumber: '',
  });
  // State pro produkty
  const [products, setProducts] = useState<Product[]>([]);
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State pro uživatele
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // State pro košík
  const [cart, setCart] = useState<Cart | null>(null);
  const [activeSection, setActiveSection] = useState('products');

  const [googlePayInitialized, setGooglePayInitialized] = useState(false);


  // Notifikace
  const notify = (message: string) => toast.success(message);
  const notifyError = (message: string) => toast.error(message);

  // Funkce pro zahájení procesu objednávky
  const handleCheckout = async () => {
    if (!currentUser) {
      notifyError("Pro dokončení objednávky se musíte přihlásit");
      setActiveSection('login');
      return;
    }
    
    // Přejdeme do sekce checkout a zobrazíme formulář pro adresu
    setActiveSection('checkout');
    setCheckoutStep('address');
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Základní validace
    if (!shippingAddress.fullName || !shippingAddress.streetLine1 || !shippingAddress.city || !shippingAddress.postalCode) {
      notifyError("Vyplňte prosím všechna povinná pole adresy");
      return;
    }
    
    // Validace českého PSČ
    const pscRegex = /^\d{3}\s?\d{2}$/;
    if (!pscRegex.test(shippingAddress.postalCode)) {
      notifyError("PSČ musí být ve formátu XXX XX nebo XXXXX");
      return;
    }
    
    try {
      // Nastavíme adresu doručení
      const addressResult:any = await setShippingAddress({
        fullName: shippingAddress.fullName,
        streetLine1: shippingAddress.streetLine1,
        streetLine2: shippingAddress.streetLine2 || "",
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode.replace(/\s/g, ''), // Odstraníme mezery
        countryCode: shippingAddress.countryCode,
        phoneNumber: shippingAddress.phoneNumber || "",
      });
      
      // Bezpečná kontrola chyb
      if (addressResult && addressResult.errorCode) {
        notifyError(addressResult.message || "Chyba při nastavení adresy doručení");
        return;
      }
      
      // Načteme dostupné doručovací metody
      const shipping = await getShippingMethods();
      
      if (!shipping || shipping.length === 0) {
        notifyError("Nejsou dostupné žádné doručovací metody");
        return;
      }
      
      setShippingMethods(shipping);
      
      // Přejdeme na další krok
      setCheckoutStep('shipping');
    } catch (error: any) {
      if (error.response?.errors) {
        const errorMessage = error.response.errors.map((e: any) => e.message).join(', ');
        notifyError(`Chyba: ${errorMessage}`);
      } else {
        notifyError("Chyba při nastavení adresy doručení");
      }
    }
  };

  // Funkce pro výběr doručovací metody
  const handleSelectShipping = async (methodId: string) => {
    try {
      // Ověření, že metoda existuje v seznamu dostupných metod
      const selectedMethod = shippingMethods.find(m => m.id === methodId);
      if (!selectedMethod) {
        notifyError(`Metoda s ID ${methodId} neexistuje v seznamu dostupných metod`);
        return;
      }
      
      // Nastavení doručovací metody
      const result = await setShippingMethod(methodId);
      
      // Kontrola chyb v odpovědi
      if (result?.errorCode) {
        notifyError(result.message || "Chyba při nastavení doručovací metody");
        return;
      }
      
      // Úspěšné nastavení
      setSelectedShippingMethod(methodId);
      notify(`Doručovací metoda ${selectedMethod.name} byla nastavena`);
      
      // Načtení platebních metod a přechod na další krok
      try {
        const payment = await getPaymentMethods();
        if (!payment || payment.length === 0) {
          notifyError("Nejsou dostupné žádné platební metody");
          return;
        }
        
        setPaymentMethods(payment);
        setCheckoutStep('payment');
        fetchCart(); // Aktualizace košíku
      } catch (paymentError: any) {
        notifyError("Chyba při načítání platebních metod");
      }
    } catch (error: any) {
      if (error.response?.errors) {
        const errorMessage = error.response.errors.map((e: any) => e.message).join(', ');
        notifyError(`Chyba: ${errorMessage}`);
      } else {
        notifyError("Chyba při výběru doručovací metody");
      }
    }
  };
  
  // Funkce pro výběr platební metody
  const handleSelectPayment = async (methodCode: string) => {
    setSelectedPaymentMethod(methodCode);
    
    // Pokud je vybrán Google Pay, zůstaneme na stejné obrazovce pro platbu
    // Jinak přejdeme na shrnutí
    if (methodCode === 'google-pay') {
      // Pouze nastavíme metodu, ale nepřecházíme na další krok
      // Google Pay tlačítko se zobrazí v kartě a platba proběhne přes něj
      notify("Platba proběhne přes Google Pay");
      initializeGooglePay();
    } else {
      setCheckoutStep('summary');
    }
  };

  // Aktualizujeme funkci initializeGooglePay, aby používala dynamicky získanou platební metodu
// Aktualizace Google Pay
const initializeGooglePay = () => {
  if (googlePayInitialized || !cart) return;
  
  try {
    console.log("Inicializuji Google Pay s částkou:", cart.totalWithTax);
    
    // Kontrola existence kontejneru
    const container = document.getElementById('google-pay-button-container');
    if (!container) {
      console.error("Kontejner pro Google Pay tlačítko neexistuje!");
      return;
    }
    
    // Inicializace pomocí GraphQL client a zpracování výsledku
    initGooglePay(
      cart.totalWithTax, 
      async (paymentData) => {
        console.log("Google Pay platba úspěšná:", paymentData);
        
        try {
          // 1. Pouze přepneme objednávku do stavu PaymentSettled
          // Nepřidáváme žádnou další platbu!
          console.log("Dokončuji objednávku po platbě Google Pay...");
          
          // Použijeme speciální funkci pro dokončení objednávky po Google Pay
          const result = await completeOrderAfterGooglePay(paymentData);
          console.log("Výsledek dokončení objednávky:", result);
          
          if (!result.errorCode) {
            setOrderCode(result.code || "");
            setOrderComplete(true);
            setCart(null);
            notify("Objednávka byla úspěšně dokončena!");
            
            // Automatické přesměrování na produkty po 3 sekundách
            setTimeout(() => {
              setActiveSection('products');
              loadProducts();
            }, 3000);
          } else {
            notifyError(result.message || "Chyba při dokončování objednávky");
          }
        } catch (error: any) {
          console.error("Chyba při dokončování objednávky:", error);
          notifyError("Chyba při dokončování objednávky");
        }
      }
    );
    setGooglePayInitialized(true);
  } catch (err) {
    console.error("Chyba při inicializaci Google Pay:", err);
    notifyError("Nepodařilo se inicializovat Google Pay");
  }
};

  // Funkce pro potvrzení objednávky
// Funkce pro potvrzení objednávky
// Upravená funkce handleCompleteOrder
// Vylepšená funkce pro dokončení objednávky
// Upravená funkce handleCompleteOrder
// Aktualizujeme funkci pro dokončení objednávky, abychom ošetřili správný typ platební metody
// Zjednodušená verze funkce pro dokončení objednávky
// Přepište handleCompleteOrder pro použití přímé dobírky
const handleCompleteOrder = async () => {
  try {
    console.log("Začínám proces dokončení objednávky");
    
    // Nejprve zkontrolujeme stav objednávky
    if (cart && cart.state !== 'ArrangingPayment') {
      try {
        const transitionResult = await transitionOrderToArrangingPayment();
        console.log("Objednávka přepnuta do stavu platby:", transitionResult);
      } catch (error) {
        console.warn("Varování při přechodu do stavu platby:", error);
        // Pokračujeme i při chybě
      }
    }
    
    // Přidáme platbu dobírkou
    const paymentResult = await addCashOnDeliveryPayment();
    console.log("Výsledek přidání platby:", paymentResult);
    
    if (paymentResult.errorCode) {
      notifyError(paymentResult.message || "Chyba při přidání platby");
      return;
    }
    
    // Dokončíme objednávku
    const result = await completeOrder();
    console.log("Výsledek dokončení objednávky:", result);
    
    if (!result.errorCode) {
      setOrderCode(result.code || "");
      setOrderComplete(true);
      setCart(null);
      notify("Objednávka byla úspěšně dokončena!");
      
      // Automatické přesměrování na produkty po 3 sekundách
      setTimeout(() => {
        setActiveSection('products');
        loadProducts();
      }, 3000);
    } else {
      notifyError(result.message || "Chyba při dokončování objednávky");
    }
  } catch (error: any) {
    console.error("Chyba při dokončování objednávky:", error);
    notifyError(error.message || "Chyba při dokončování objednávky");
  }
};

// Přidáme pomocnou funkci pro načtení produktů (pro použití i jinde v kódu)
const loadProducts = async () => {
  try {
    const items = await fetchProducts();
    setProducts(items as Product[]);
  } catch (error) {
    notifyError("Chyba při načítání produktů");
  }
};

  // Handler pro registraci
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    try {
      const response: any = await registerUser(email, password, firstName, lastName);
      
      if (response.registerCustomerAccount?.success) {
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        notify('Registrace proběhla úspěšně!');
      } else {
        const errorMsg = response.registerCustomerAccount?.message || 'Nastala neočekávaná chyba';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.errors?.[0]?.message || error.message || 'Nastala neočekávaná chyba';
      setErrorMessage(errorMsg);
    }
  };

  // Handler pro přihlášení
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginResult = await loginUser(email, password);
      if (loginResult.success) {
        try {
          const user = await getUserInfo();
          if (user) {
            setCurrentUser(user as User);
            notify(`Vítejte, ${user.firstName}!`);
            fetchCart(); // Načteme košík po přihlášení
          } else {
            notifyError("Nepodařilo se načíst informace o uživateli");
          }
        } catch (error) {
          notifyError("Nepodařilo se načíst informace o uživateli");
        }
      }
    } catch (error: any) {
      notifyError(error.message || "Přihlášení se nezdařilo");
    }
  };

  // Handler pro odhlášení
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setCart(null);
      notify('Odhlášení proběhlo úspěšně');
    } catch (error) {
      notifyError('Chyba při odhlášení');
    }
  };

  // Funkce pro vyhledávání produktů
  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const items = await fetchProductByName(searchTerm);
      setSearchedProducts(items as Product[]);
      setActiveSection('search');
    } catch (error) {
      notifyError('Chyba při vyhledávání produktů');
    }
  };

  // Funkce pro práci s košíkem
// Vylepšená funkce pro načtení košíku
const fetchCart = async () => {
  try {
    console.log('Načítám aktuální košík...');
    const activeOrder = await getActiveOrder();
    console.log('Košík načten:', activeOrder);
    
    if (activeOrder) {
      setCart(activeOrder as Cart);
    } else {
      // Pokud není žádný aktivní košík, nastavíme null
      setCart(null);
    }
  } catch (error: any) {
    console.error('Chyba při načítání košíku:', error);
    // U chyby načítání košíku NEMÁ smysl zobrazovat notifikaci - uživatel by ji viděl například při prázdném košíku
  }
};

  const handleAddToCart = async (productId: string, quantity = 1) => {
    try {
      await addItemToOrder(productId, quantity);
      fetchCart(); // Znovu načteme košík
      notify('Produkt byl přidán do košíku');
    } catch (error) {
      notifyError('Chyba při přidávání do košíku');
    }
  };

  // Vylepšená funkce pro odstranění položky z košíku
  // Vylepšená funkce pro odstranění položky z košíku
const handleRemoveFromCart = async (orderLineId: string) => {
  try {
    console.log('Odstraňuji položku z košíku, ID:', orderLineId);
    
    // Použijeme naši novou funkci pro zajištění správného stavu
    await ensureOrderInAddingItemsState();
    
    // Odstranění položky
    const result = await removeOrderLine(orderLineId);
    console.log('Výsledek odstranění položky:', result);
    
    // Počkáme chvíli před načtením košíku (aby měl backend čas na zpracování)
    setTimeout(async () => {
      try {
        const updatedCart = await getActiveOrder();
        console.log('Košík byl aktualizován, nový stav:', updatedCart);
        setCart(updatedCart); // Přímo aktualizujeme stav
        notify('Položka byla odstraněna z košíku');
      } catch (refreshError) {
        console.error("Chyba při aktualizaci košíku:", refreshError);
        notifyError("Nepodařilo se aktualizovat košík po odstranění položky");
      }
    }, 800); // Delší timeout pro jistotu
  } catch (error: any) {
    console.error('Chyba při odstraňování z košíku:', error);
    
    // Pokud chyba obsahuje "AddingItems", pokusíme se resetovat stav košíku
    if (error.message && (error.message.includes("AddingItems") || error.message.includes("transition"))) {
      notifyError("Chyba stavu košíku, pokusíme se opravit");
      
      try {
        // Pokusíme se explicitně resetovat stav košíku
        await fetch("http://localhost:3000/shop-api", {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
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
          })
        });
        
        // Zkusíme znovu odstranit po resetu stavu
        setTimeout(() => {
          fetchCart();
          notify("Stav košíku byl resetován, zkuste akci znovu");
        }, 500);
      } catch (resetError) {
        console.error("Nepodařilo se resetovat stav košíku:", resetError);
        notifyError("Nepodařilo se opravit stav košíku");
      }
    } else {
      notifyError(error.message || 'Chyba při odstraňování z košíku');
    }
  }
};

  // Načtení produktů při prvním renderování
  useEffect(() => {
    async function loadProducts() {
      try {
        const items = await fetchProducts();
        setProducts(items as Product[]);
      } catch (error) {
        // Tiché zpracování chyby
      }
    }
    loadProducts();
    
    // Pokud je uživatel přihlášen, načteme jeho informace a košík
    async function checkUserAndCart() {
      try {
        const user = await getUserInfo();
        if (user) {
          setCurrentUser(user as User);
          fetchCart();
        }
      } catch (error) {
        // Uživatel není přihlášen - tiché zpracování
      }
    }
    checkUserAndCart();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (checkoutStep === 'payment' && cart) {
      console.log("Krok platby aktivní, čekám na vykreslení kontejneru...");
      
      setGooglePayInitialized(false);
      
      setTimeout(() => {
        const googlePayContainer = document.getElementById('google-pay-button-container');
        console.log("Kontrola kontejneru:", googlePayContainer ? "nalezen" : "nenalezen");
        
        if (googlePayContainer && !googlePayInitialized) {
          console.log("Spouštím inicializaci Google Pay");
          initializeGooglePay(); // <-- ZDE po vykreslení kontejneru
        }
      }, 1000);
    }
  }, [checkoutStep, cart]);
  return (
    <div className="container">
      <Toaster position="top-right" />
      
      <header>
        <h1>E-commerce obchod</h1>
        <nav>
          <button onClick={() => setActiveSection('products')}>Produkty</button>
          <button onClick={() => setActiveSection('search')}>Vyhledávání</button>
          {currentUser ? (
            <>
              <button onClick={() => setActiveSection('cart')}>Košík</button>
              <button onClick={handleLogout}>Odhlásit se</button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveSection('login')}>Přihlášení</button>
              <button onClick={() => setActiveSection('register')}>Registrace</button>
            </>
          )}
        </nav>
      </header>

      {/* Uživatelský panel */}
      {currentUser && (
        <div className="user-panel">
          <p>Přihlášen: {currentUser.firstName} {currentUser.lastName} ({currentUser.emailAddress})</p>
        </div>
      )}

      {/* Registrační sekce */}
      {activeSection === 'register' && (
        <section>
          <h2>Registrace nového uživatele</h2>
          <form onSubmit={handleRegister}>
            <div>
              <label>Jméno:</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Příjmení:</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Heslo:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMessage && <p className="error">{errorMessage}</p>}
            <button type="submit">Registrovat se</button>
          </form>
        </section>
      )}

      {/* Přihlašovací sekce */}
      {activeSection === 'login' && (
        <section>
          <h2>Přihlášení</h2>
          <form onSubmit={handleLogin}>
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Heslo:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Přihlásit se</button>
          </form>
        </section>
      )}

      {/* Sekce produktů */}
      {activeSection === 'products' && (
        <section>
          <h2>Všechny produkty</h2>
          <div className="products-grid">
          {products.map((product:any) => (
            <div key={product.id} className="product-card">
              <h3>{product.name}</h3>
              <div className="product-details">
                <p className="product-description">{product.description}</p>
                <p className="product-price">{product.priceWithTax} Kč</p>
                <p className="product-stock">
                  {product.stockLevel == "IN_STOCK" ? 'Skladem' : 'Není skladem'}
                </p>
              </div>
              {product.featuredAsset && (
                <img src={product.featuredAsset.preview} alt={product.name} />
              )}
              {currentUser && product.stockLevel == "IN_STOCK" && (
                <button 
                  onClick={() => handleAddToCart(product.variantId)} 
                  className="add-to-cart-btn"
                >
                  Přidat do košíku
                </button>
              )}
              {currentUser && product.stockLevel === 0 && (
                <button disabled className="out-of-stock-btn">
                  Není skladem
                </button>
              )}
            </div>
          ))}
          </div>
        </section>
      )}

      {/* Sekce vyhledávání */}
      {activeSection === 'search' && (
        <section>
          <h2>Vyhledávání produktů</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Zadejte název produktu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button onClick={handleSearch}>Hledat</button>
          </div>

          <div className="products-grid">
            {searchedProducts.length === 0 && <p>Žádné produkty nenalezeny</p>}
            {searchedProducts.map((product) => (
              <div key={product.id} className="product-card">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                {product.featuredAsset && (
                  <img src={product.featuredAsset.preview} alt={product.name} />
                )}
                {currentUser && (
                  <button onClick={() => handleAddToCart(product.id)}>
                    Přidat do košíku
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sekce košíku */}
      // Přidejte tento kód do sekce košíku
{activeSection === 'cart' && (
  <section>
    <h2>Váš košík</h2>
    {!cart || !cart.lines || cart.lines.length === 0 ? (
      <p>Váš košík je prázdný</p>
    ) : (
      <div className="cart-items">
        {cart.lines.map((line) => (
          <div key={line.id} className="cart-item">
            <h3>{line.productVariant.name}</h3>
            <p>Množství: {line.quantity}</p>
            <p>Cena: {line.linePriceWithTax} Kč</p>
            <button onClick={() => handleRemoveFromCart(line.id)}>Odebrat</button>
          </div>
        ))}
        <div className="cart-summary">
          <p>Celková cena: {cart.totalWithTax} Kč</p>
          <div className="cart-actions">
            <button onClick={handleCheckout} className="checkout-btn">Pokračovat k objednávce</button>
            <button 
              onClick={async () => {
                try {
                  // Postupně odstraníme všechny položky
                  for (const line of cart.lines) {
                    await removeOrderLine(line.id);
                  }
                  // Aktualizujeme košík
                  setTimeout(fetchCart, 800);
                  notify('Košík byl vymazán');
                } catch (error) {
                  notifyError('Nepodařilo se vymazat košík');
                }
              }}
              className="clear-cart-btn"
            >
              Vymazat košík
            </button>
          </div>
        </div>
        
        {/* Debug sekce */}
        // Vylepšená debugovací sekce do košíku
<div className="debug-section">
  <h4>Informace o košíku</h4>
  <p>Stav košíku: <strong>{cart.state}</strong></p>
  <p>ID košíku: {cart.id}</p>
  <p>Kód košíku: {cart.code}</p>
  
  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
    <button 
      onClick={async () => {
        try {
          await fetch("http://localhost:3000/shop-api", {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
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
            })
          });
          notify("Košík byl přepnut do stavu 'AddingItems'");
          fetchCart(); // Aktualizujeme košík
        } catch (error) {
          notifyError("Chyba při přepínání stavu košíku");
        }
      }}
      className="btn-secondary"
    >
      Resetovat na AddingItems
    </button>
    
    <button 
      onClick={async () => {
        try {
          // Kompletní vymazání košíku
          for (const line of cart.lines) {
            try {
              await ensureOrderInAddingItemsState();
              await removeOrderLine(line.id);
            } catch (e) {
              console.error(`Chyba při odstraňování položky ${line.id}:`, e);
            }
          }
          
          // Aktualizujeme košík
          setTimeout(fetchCart, 1000);
          notify('Košík byl úplně vymazán');
        } catch (error) {
          notifyError('Nepodařilo se vymazat košík');
        }
      }}
      className="btn-danger"
      style={{ backgroundColor: '#dc3545' }}
    >
      Úplně vymazat košík
    </button>
  </div>
</div>
      </div>
    )}
  </section>
)}

  {/* Checkout sekce */}
  {activeSection === 'checkout' && (
  <section className="checkout-section">
    <h2>Dokončení objednávky</h2>
    
    {orderComplete ? (
      <div className="order-complete">
        <h3>Objednávka byla úspěšně dokončena!</h3>
        <p>Kód objednávky: {orderCode}</p>
        <p>Děkujeme za Váš nákup.</p>
        <button onClick={() => setActiveSection('products')}>
          Zpět na produkty
        </button>
      </div>
    ) : (
      <>
        {/* Kroky objednávky */}
        <div className="checkout-steps">
          <div className={`step ${checkoutStep === 'address' ? 'active' : ''}`}>
            1. Adresa
          </div>
          <div className={`step ${checkoutStep === 'shipping' ? 'active' : ''}`}>
            2. Doručení
          </div>
          <div className={`step ${checkoutStep === 'payment' ? 'active' : ''}`}>
            3. Platba
          </div>
          <div className={`step ${checkoutStep === 'summary' ? 'active' : ''}`}>
            4. Shrnutí
          </div>
        </div>
        {checkoutStep === 'address' && (
          <form onSubmit={handleAddressSubmit} className="address-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Jméno a příjmení:</label>
                <input
                  type="text"
                  id="fullName"
                  value={shippingAddress.fullName}
                  onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="streetLine1">Ulice a číslo popisné:</label>
              <input
                type="text"
                id="streetLine1"
                value={shippingAddress.streetLine1}
                onChange={(e) => setShippingAddress({...shippingAddress, streetLine1: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="streetLine2">Doplněk adresy (volitelné):</label>
              <input
                type="text"
                id="streetLine2"
                value={shippingAddress.streetLine2}
                onChange={(e) => setShippingAddress({...shippingAddress, streetLine2: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Město:</label>
                <input
                  type="text"
                  id="city"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="postalCode">PSČ:</label>
                <input
                  type="text"
                  id="postalCode"
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress({...shippingAddress, postalCode: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="phoneNumber">Telefon:</label>
              <input
                type="tel"
                id="phoneNumber"
                value={shippingAddress.phoneNumber}
                onChange={(e) => setShippingAddress({...shippingAddress, phoneNumber: e.target.value})}
              />
            </div>
            
            <button type="submit" className="btn-primary">Pokračovat k doručení</button>
          </form>
        )}
        
          {/* Doručovací metody */}
          {checkoutStep === 'shipping' && (
            <div className="shipping-methods">
              <h3>Vyberte způsob doručení</h3>
              
              {shippingMethods.length === 0 ? (
                <div className="empty-message">
                  <p>Nejsou dostupné žádné doručovací metody</p>
                  <button className="btn-secondary" onClick={async () => {
                    try {
                      const methods = await getShippingMethods();
                      setShippingMethods(methods);
                    } catch (error) {
                      notifyError("Nepodařilo se načíst doručovací metody");
                    }
                  }}>Zkusit znovu načíst</button>
                </div>
              ) : (
                shippingMethods.map((method) => (
                  <div 
                    key={method.id} 
                    className={`method-card ${selectedShippingMethod === method.id ? 'selected' : ''}`}
                    onClick={() => handleSelectShipping(method.id)}
                  >
                    <div className="method-header">
                      <h4>{method.name}</h4>
                    </div>
                    <p>{method.description}</p>
                    <p className="price">{method.priceWithTax} Kč</p>
                  </div>
                ))
              )}
              
              <button className="btn-secondary" onClick={() => setCheckoutStep('address')}>
                Zpět na adresu
              </button>
            </div>
          )}
          
          {/* Platební metody */}
          {checkoutStep === 'payment' && (
            <div className="payment-methods">
              <h3>Vyberte způsob platby</h3>
              {paymentMethods.map((method:any) => (
                <div 
                  key={method.id} 
                  className={`method-card ${selectedPaymentMethod === method.code ? 'selected' : ''}`}
                  onClick={() => handleSelectPayment(method.code)}
                >
                  <h4>{method.name}</h4>
                  <p>{method.description}</p>
                </div>
              ))}
              
              {/* Google Pay tlačítko */}
              <div 
                className={`method-card google-pay-card ${selectedPaymentMethod === 'google-pay' ? 'selected' : ''}`}
                onClick={() => handleSelectPayment('google-pay')}
              >
                <h4>Google Pay (Testovací režim)</h4>
                <p>Zaplatit rychle a bezpečně pomocí Google Pay</p>
                
                {/* Google Pay tlačítko kontejner */}
                <div 
                  id="google-pay-button-container" 
                  className="google-pay-button-container"
                  style={{ 
                    minHeight: '40px', 
                    margin: '15px 0', 
                    border: '2px dashed red'  // Pro kontrolu, že kontejner existuje
                  }}
                ></div>
                
                {selectedPaymentMethod === 'google-pay' && (
                  <div className="google-pay-info">
                    <p>Google Pay tlačítko by se mělo zobrazit výše</p>
                    <button 
                      onClick={() => {
                        console.log('Ruční inicializace Google Pay');
                        // Pro jistotu resetujeme stav a zkusíme znovu
                        setGooglePayInitialized(false);
                        setTimeout(() => initializeGooglePay(), 100);
                      }}
                      className="btn-primary"
                    >
                      Zkusit načíst Google Pay
                    </button>
                    <p className="payment-test-info">Toto je testovací prostředí, žádné skutečné platby nebudou provedeny.</p>
                  </div>
                )}
              </div>

              
    
    <div className="payment-navigation">
      <button className="btn-secondary" onClick={() => setCheckoutStep('shipping')}>
        Zpět k dopravě
      </button>
      
      {selectedPaymentMethod && selectedPaymentMethod !== 'google-pay' && (
        <button className="btn-primary" onClick={() => setCheckoutStep('summary')}>
          Pokračovat k souhrnu
        </button>
      )}
    </div>
  </div>
)}

{orderComplete && (
  <div className="order-complete">
    <h3>Objednávka byla úspěšně dokončena!</h3>
    <p>Kód objednávky: {orderCode}</p>
    <p>Děkujeme za Váš nákup.</p>
    <p className="redirect-info">Za 3 sekundy budete přesměrováni na seznam produktů...</p>
    <div className="countdown-timer">
      <div className="spinner"></div>
    </div>
    <button onClick={() => {
      setActiveSection('products');
      loadProducts(); // Znovu načteme produkty pro aktuální stav zásob
    }} className="btn-primary mt-3">
      Přejít na produkty ihned
    </button>
  </div>
)}




          
          {/* Shrnutí objednávky */}
          {checkoutStep === 'summary' && cart && (
            <div className="order-summary">
              <h3>Shrnutí objednávky</h3>
              
              <div className="summary-section">
                <h4>Položky</h4>
                {cart.lines.map((line) => (
                  <div key={line.id} className="summary-item">
                    <p>{line.productVariant.name} x {line.quantity}</p>
                    <p>{line.linePriceWithTax} Kč</p>
                  </div>
                ))}
              </div>
              
              <div className="summary-section">
                <h4>Doručení</h4>
                {shippingMethods.find((m:any) => m.id === selectedShippingMethod)?.name}
                <p>{shippingMethods.find((m:any) => m.id === selectedShippingMethod)?.priceWithTax} Kč</p>
              </div>
              
              <div className="summary-section">
                <h4>Platba</h4>
                <p>{paymentMethods.find((m:any) => m.code === selectedPaymentMethod)?.name}</p>
              </div>
              
              <div className="total">
                <h4>Celková cena</h4>
                <p>{cart.totalWithTax} Kč</p>
              </div>
              
              <button onClick={handleCompleteOrder} className="complete-order-btn">
                Dokončit objednávku
              </button>
              
              <button className="btn-secondary" onClick={() => setCheckoutStep('payment')} style={{marginTop: "10px"}}>
                Zpět k platbě
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        nav button {
          margin-left: 10px;
          padding: 8px 16px;
          background: #000055;
          border: 1px solid #ccc;
          border-radius: 4px;
          border-color: #000099;
          color: white;
          cursor: pointer;
        }
        
        section {
          margin-bottom: 40px;
        }
        
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .product-card {
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 5px;
        }
        
        .product-card img {
          max-width: 100%;
          height: auto;
        }
        
        form div {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
        }
        
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .error {
          color: red;
          margin-top: 10px;
        }
        
        button {
          padding: 10px 15px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .user-panel {
          background: #000055;
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 4px;
          color: white;
        }
        
        .cart-item {
          border-bottom: 1px solid #eee;
          padding: 15px 0;
        }
        
        .cart-summary {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #eee;
        }

        .checkout-steps {
          display: flex;
          margin-bottom: 30px;
        }
        
        .step {
          flex: 1;
          text-align: center;
          padding: 10px;
          border-bottom: 2px solid #eee;
        }
        
        .step.active {
          border-bottom: 2px solid #000055;
          color: #000055;
          font-weight: bold;
        }
        
        .method-card {
          border: 1px solid #eee;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .method-card:hover {
          border-color: #000055;
        }

        .method-card.selected {
          border-color: #000055;
          background-color: #f0f8ff;
        }
        
        .price {
          font-weight: bold;
        }
        
        .summary-section {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .total {
          font-weight: bold;
          margin-top: 20px;
          font-size: 1.2em;
        }
        
        .checkout-navigation {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
        }

        .complete-order-btn {
          background-color: #28a745;
          padding: 12px 20px;
          font-size: 1.1em;
          width: 100%;
          margin-top: 20px;
        }
        
        .order-complete {
          text-align: center;
          padding: 30px;
        }

        .shipping-methods {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .form-row {
          display: flex;
          gap: 15px;
        }
        
        .form-group {
          flex: 1;
        }
        
        .address-form {
          margin-bottom: 20px;
        }
        
        .payment-methods {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .product-details {
    margin: 10px 0;
  }
  
  .product-description {
    margin-bottom: 10px;
    font-size: 0.9em;
  }
  
  .product-price {
    font-weight: bold;
    font-size: 1.2em;
    color: #0000ff;
    margin: 5px 0;
  }
  
  .product-stock {
    font-size: 0.9em;
    margin: 5px 0;
  }
  
  .stock-level {
    font-weight: bold;
  }
  
  .in-stock {
    color: #28a745;
  }
  
  .low-stock {
    color: #ffc107;
  }
  
  .out-of-stock {
    color: #dc3545;
  }

  .add-to-cart-btn {
    width: 100%;
    margin-top: 10px;
    background-color: #1900ff;
  }
  
  .out-of-stock-btn {
    width: 100%;
    margin-top: 10px;
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.65;
  }
  
  .google-pay-card {
    border: 1px solid #eee;
    padding: 15px;
    margin-top: 20px;
    border-radius: 4px;
  }
  
  #google-pay-button-container {
    margin-top: 10px;
    height: 40px;
  }

  .payment-navigation {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
  }
  
  .payment-test-info {
    color: #6c757d;
    font-size: 0.9em;
    margin-top: 10px;
    font-style: italic;
  }
  
  .google-pay-button-container {
    margin: 15px 0;
    min-height: 40px;
  }
  
  .google-pay-info {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed #eee;
  }
  
  .google-pay-card.selected {
    border: 2px solid #000055;
    background-color: #f8f9fa;
  }

  .redirect-info {
    color: #007bff;
    margin-top: 10px;
    font-style: italic;
  }
  
  .countdown-timer {
    display: flex;
    justify-content: center;
    margin: 20px 0;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #007bff;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .mt-3 {
    margin-top: 15px;
  }

.cart-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.checkout-btn {
  background-color: #1900ff;
  flex: 3;
  margin-right: 10px;
}

.clear-cart-btn {
  background-color: #dc3545;
  flex: 1;
}

.debug-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.debug-info {
  font-family: monospace;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 200px;
  background-color: #212529;
  color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
}

.debug-toggle {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
      `}</style>
    </div>
  );
}