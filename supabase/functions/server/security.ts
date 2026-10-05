// Tokens, hashing, constant-time compare, admin tokens.
import { encodeBase64Url } from "jsr:@std/encoding@1/base64url";

const enc = new TextEncoder();

export function randomToken(bytes = 32): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (length leak only). */
export function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

// ─── Admin tokens: "<expiresAtMs>.<hmac>" signed with the service role key ───

const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! + ":ember-admin"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return encodeBase64Url(new Uint8Array(sig));
}

export async function issueAdminToken(): Promise<string> {
  const exp = String(Date.now() + ADMIN_TTL_MS);
  return `${exp}.${await hmac(`admin.${exp}`)}`;
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(`admin.${exp}`));
}

export function verifyAdminPasscode(passcode: unknown): boolean {
  const expected = Deno.env.get("ADMIN_PASSCODE");
  if (!expected || typeof passcode !== "string") return false;
  return safeEqual(passcode, expected);
}
