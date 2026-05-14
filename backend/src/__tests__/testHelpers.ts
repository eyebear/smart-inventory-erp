import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const KEYS_DIR = path.resolve(__dirname, "../../keys/dev");

export const TEST_PRIVATE_KEY_PATH = path.join(KEYS_DIR, "jwt_private.pem");
export const TEST_PUBLIC_KEY_PATH = path.join(KEYS_DIR, "jwt_public.pem");

export const TEST_PRIVATE_KEY = fs.readFileSync(TEST_PRIVATE_KEY_PATH, "utf8");
export const TEST_PUBLIC_KEY = fs.readFileSync(TEST_PUBLIC_KEY_PATH, "utf8");

export function configureJwtTestEnv(): void {
  process.env.JWT_PRIVATE_KEY_PATH = TEST_PRIVATE_KEY_PATH;
  process.env.JWT_PUBLIC_KEY_PATH = TEST_PUBLIC_KEY_PATH;
}

export type SignTokenInput = {
  userId: number;
  username?: string;
  expiresIn?: string;
};

export function signTestToken({
  userId,
  username = "test",
  expiresIn = "5m"
}: SignTokenInput): string {
  return jwt.sign(
    {
      sub: String(userId),
      username
    },
    TEST_PRIVATE_KEY,
    {
      algorithm: "RS256",
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
      issuer: "smart-inventory-erp",
      audience: "smart-inventory-erp-clients"
    }
  );
}
