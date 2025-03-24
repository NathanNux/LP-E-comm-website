import { useEffect, useState } from "react";
import { fetchProducts } from "./api/showAllProducts";
import { fetchProductByName } from "./api/showProductByName";
import { loginUser } from "./api/loginUser";
import { getUserInfo } from "./api/getUserInfo";
import { registerUser } from "./api/registerUser";
import toast, { Toaster } from 'react-hot-toast';



export default function Home() {
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const notify = () => toast.success('Registrace proběhla úspěšně!');
  const notifyError = () => toast.error('Nastala neočekávaná chyba');
  const showUserInfo = (firstName: string, lastName: string, email: string) => toast(`Jméno: ${firstName}, Příjmení: ${lastName}, Email: ${email}`);
  const showErrorMessage = (message: string) => toast.error(message);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(''); // Vyčistíme předchozí chyby
    
    try {
      const response:any = await registerUser(email, password, firstName, lastName);
      console.log('Server response:', response); // Pro debugování
      
      if (response.registerCustomerAccount?.success) {
        console.log('Registrace proběhla úspěšně');
        // Vyčistíme formulář
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        notify();
      } else {
        const errorMsg = response.registerCustomerAccount?.message || 'Nastala neočekávaná chyba';
        setErrorMessage(errorMsg);
      }
    } catch (error: any) {
      console.error('Detailní chyba:', error);
      const errorMsg = error.response?.errors?.[0]?.message || error.message || 'Nastala neočekávaná chyba';
      setErrorMessage(errorMsg);
    }
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const loginResult = await loginUser(email, password);
      if (loginResult.success) {
        // Úspěšné přihlášení
        try {
          const user = await getUserInfo();
          if (user) {
            showUserInfo(user.firstName, user.lastName, user.emailAddress);
          } else {
            showErrorMessage("Nepodařilo se načíst informace o uživateli");
          }
        } catch (error) {
          console.error("Chyba při načítání uživatelských dat:", error);
          showErrorMessage("Nepodařilo se načíst informace o uživateli");
        }
      }
    } catch (error: any) {
      console.error("Chyba přihlášení:", error);
      showErrorMessage(error.message || "Přihlášení se nezdařilo");
    }
  }

  async function handleSearch() {
    if (!searchTerm) return;
    const items = await fetchProductByName(searchTerm);
    setSearchedProducts(items);
  }

  useEffect(() => {
    async function loadProducts() {
      const items = await fetchProducts();
      setProducts(items);
    }
    loadProducts();
  }, []);

  return (
    <div>
      <Toaster />
     <h1>registrace</h1>
     <form onSubmit={handleSubmit}>
     <div>
          <label>firstName:</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Lastname:</label>
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
        {errorMessage && <p>{errorMessage}</p>}
        <button type="submit">Registrovat se</button>
      </form>
      <h1>přihlášení</h1>
      <form onSubmit={handleLogin}>
        <button type="submit" color="blue">Přihlásit se</button>
      </form>
      <h1>Seznam všech produktů</h1>
      <ul>
        {products.map((product:any) => (
          <li key={product.id}>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            {product.featuredAsset && (
              <img src={product.featuredAsset.preview} alt={product.name} width={100} />
            )}
          </li>
        ))}
      </ul>

      <h1>Vyhledání produktu</h1>
      <input
        type="text"
        placeholder="Zadej jméno produktu"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch}>Hledat</button>

      <ul>
        {searchedProducts.length === 0 && <p>Žádné produkty nenalezeny</p>}
        {searchedProducts.map((product:any) => (
          <li key={product.id}>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            {product.featuredAsset && (
              <img src={product.featuredAsset.preview} alt={product.name} width={100} />
            )}
          </li>
        ))}
      </ul>
    </div>
    
  );
}
