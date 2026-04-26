type Product = {
  id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  origin_country: string;
  supplier_name: string;
};

async function getProducts(): Promise<Product[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/api/products`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1 className="page-title">Products</h1>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>English Name</th>
              <th>Chinese Name</th>
              <th>Category</th>
              <th>Origin</th>
              <th>Supplier</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name_en}</td>
                <td>{product.name_zh}</td>
                <td>{product.category}</td>
                <td>{product.origin_country}</td>
                <td>{product.supplier_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}