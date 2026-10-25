import crypto from "crypto";

const SECRET = process.env.ADMIN_SECRET ?? "track-local-secret";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "track-2026";
export const SESSION_COOKIE = "admin_session";

export function sessionToken(): string {
  return crypto.createHmac("sha256", SECRET).update("admin-ok-v1").digest("hex");
}

export function passwordOk(input: string): boolean {
  const given = Buffer.from(input);
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isAdmin(req: Request): boolean {
  const value = readCookie(req, SESSION_COOKIE);
  if (!value) return false;
  const given = Buffer.from(value);
  const expected = Buffer.from(sessionToken());
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}
