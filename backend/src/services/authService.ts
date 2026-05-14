import bcrypt from "bcrypt";
import { RowDataPacket } from "mysql2";
import { db } from "../config/database";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  store_id: number | null;
};

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  store_id: number | null;
  is_active: number;
};

export async function validateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const [rows] = await db.query<UserRow[]>(
    `
    SELECT id, username, password_hash, role, store_id, is_active
    FROM users
    WHERE username = ?
    `,
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];

  if (!user.is_active) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    store_id: user.store_id
  };
}

export async function findActiveUserById(
  userId: number
): Promise<AuthUser | null> {
  const [rows] = await db.query<UserRow[]>(
    `
    SELECT id, username, password_hash, role, store_id, is_active
    FROM users
    WHERE id = ?
    `,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];

  if (!user.is_active) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    store_id: user.store_id
  };
}
