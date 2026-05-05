type ExpiringProduct = {
  batch_id: number;
  batch_code: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  product_id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  store_id: number;
  store_name: string;
  city: string;
};

async function getExpiringProducts(): Promise<ExpiringProduct[]> {
const apiBaseUrl =
  process.env.SERVER_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/api/expiring-products?days=10`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch expiring products");
  }

  return response.json();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

export default async function ExpiringProductsPage() {
  const products = await getExpiringProducts();

  return (
    <div>
      <h1 className="page-title">Expiring Products</h1>

      <div className="card">
        <p>
          Products listed here are expiring soon and should be reviewed by store
          managers.
        </p>
      </div>

      <div className="card">
        {products.length === 0 ? (
          <p>No products are expiring within the selected window.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Chinese Name</th>
                <th>Category</th>
                <th>Batch Code</th>
                <th>Quantity</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
              </tr>
            </thead>

            <tbody>
              {products.map((item) => (
                <tr key={item.batch_id}>
                  <td>{item.store_name}</td>
                  <td>{item.sku}</td>
                  <td>{item.name_en}</td>
                  <td>{item.name_zh}</td>
                  <td>{item.category}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.quantity}</td>
                  <td>{formatDate(item.expiry_date)}</td>
                  <td>{item.days_until_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}