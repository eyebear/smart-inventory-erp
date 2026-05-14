export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const AUTH_TOKEN_STORAGE_KEY = "authToken";
export const AUTH_USER_STORAGE_KEY = "authUser";

export function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export type AuthFetchOptions = RequestInit & {
  token?: string | null;
};

export async function authFetch(path: string, options: AuthFetchOptions = {}) {
  const { token: explicitToken, headers, ...rest } = options;
  const token = explicitToken ?? readStoredToken();

  const mergedHeaders = new Headers(headers);

  if (token) {
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (
    rest.body &&
    !mergedHeaders.has("Content-Type") &&
    typeof rest.body === "string"
  ) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders
  });
}
