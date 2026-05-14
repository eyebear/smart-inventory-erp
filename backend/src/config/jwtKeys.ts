import fs from "fs";

export const JWT_ALGORITHM = "RS256" as const;

function readKey(envVar: string, pathEnvVar: string, label: string): string {
  const path = process.env[pathEnvVar];
  if (path && path.length > 0) {
    try {
      return fs.readFileSync(path, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read ${label} from ${path}: ${(error as Error).message}`
      );
    }
  }

  const raw = process.env[envVar];
  if (!raw || raw.length === 0) {
    throw new Error(
      `${label} is not configured. Set ${envVar} (PEM string) or ${pathEnvVar} (file path).`
    );
  }

  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

let cachedPrivateKey: string | null = null;
let cachedPublicKey: string | null = null;

export function getPrivateKey(): string {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }
  cachedPrivateKey = readKey(
    "JWT_PRIVATE_KEY",
    "JWT_PRIVATE_KEY_PATH",
    "JWT private key"
  );
  return cachedPrivateKey;
}

export function getPublicKey(): string {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }
  cachedPublicKey = readKey(
    "JWT_PUBLIC_KEY",
    "JWT_PUBLIC_KEY_PATH",
    "JWT public key"
  );
  return cachedPublicKey;
}

export function resetKeyCacheForTests(): void {
  cachedPrivateKey = null;
  cachedPublicKey = null;
}
