import { useEffect, useState } from "react";
import { fetchProducts } from "./api/showAllProducts";
import { fetchProductByName } from "./api/showProductByName";
import { loginUser } from "./api/loginUser";
import { getUserInfo } from "./api/getUserInfo";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await loginUser(email, password);
      window.location.href = "/"; // Přesměrování po přihlášení
    } catch (error) {
      setErrorMessage("Chyba při přihlášení. Zkontrolujte své přihlašovací údaje.");
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
