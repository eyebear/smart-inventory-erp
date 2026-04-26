export type LegacySupplier = {
  legacy_supplier_id: string;
  name: string;
  country: string;
  category: string;
  contact_email: string;
  status: string;
};

export async function fetchLegacySuppliers(): Promise<LegacySupplier[]> {
  const phpServiceUrl = process.env.PHP_SERVICE_URL;

  if (!phpServiceUrl) {
    throw new Error("PHP_SERVICE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 3000);

  try {
    const response = await fetch(`${phpServiceUrl}/suppliers.php`, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`PHP service returned status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}