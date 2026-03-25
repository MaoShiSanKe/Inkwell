import "server-only";

import { hashPasswordValue, verifyPasswordValue } from "./password-utils";

export function hashPassword(password: string) {
  return hashPasswordValue(password);
}

export function verifyPassword(password: string, storedHash: string) {
  return verifyPasswordValue(password, storedHash);
}
