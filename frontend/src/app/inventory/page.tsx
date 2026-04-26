type InventoryBatch = {
  batch_id: number;
  batch_code: string;
  quantity: number;
  expiry_date: string;
  received_date: string;
  product_id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  store_id: number;
  store_name: string;
  city: string;
};

async function getInventory(): Promise<InventoryBatch[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/api/inventory`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch inventory");
  }

  return response.json();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

export default async function InventoryPage() {
  const inventory = await getInventory();

  return (
    <div>
      <h1 className="page-title">Inventory</h1>

      <div className="card">
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
              <th>Received Date</th>
              <th>Expiry Date</th>
            </tr>
          </thead>

          <tbody>
            {inventory.map((item) => (
              <tr key={item.batch_id}>
                <td>{item.store_name}</td>
                <td>{item.sku}</td>
                <td>{item.name_en}</td>
                <td>{item.name_zh}</td>
                <td>{item.category}</td>
                <td>{item.batch_code}</td>
                <td>{item.quantity}</td>
                <td>{formatDate(item.received_date)}</td>
                <td>{formatDate(item.expiry_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}