type WasteSummary = {
  store_name: string;
  category: string;
  total_quantity_wasted: string;
  total_estimated_loss: string;
};

async function getWasteSummary(): Promise<WasteSummary[]> {
  const apiBaseUrl =
    process.env.SERVER_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/api/analytics/waste-summary`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch waste summary");
  }

  return response.json();
}

export default async function WasteAnalyticsPage() {
  const wasteSummary = await getWasteSummary();

  return (
    <div>
      <h1 className="page-title">Waste Analytics</h1>

      <div className="card">
        <p>
          This page summarizes discarded or expired inventory by store and
          product category.
        </p>
      </div>

      <div className="card">
        {wasteSummary.length === 0 ? (
          <p>No waste records are available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Category</th>
                <th>Total Quantity Wasted</th>
                <th>Total Estimated Loss</th>
              </tr>
            </thead>

            <tbody>
              {wasteSummary.map((item, index) => (
                <tr key={`${item.store_name}-${item.category}-${index}`}>
                  <td>{item.store_name}</td>
                  <td>{item.category}</td>
                  <td>{item.total_quantity_wasted}</td>
                  <td>${Number(item.total_estimated_loss).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}