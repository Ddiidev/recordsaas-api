import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  randomUUID,
} from "node:crypto";
import type { KeyObject } from "node:crypto";

const SESSION_AUDIENCE = "recordsaas-api";
const ENTITLEMENT_AUDIENCE = "recordsaas-desktop";
const DESKTOP_CODE_AUDIENCE = "recordsaas-desktop-exchange";

const SESSION_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ENTITLEMENT_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const DESKTOP_CODE_TTL_SECONDS = 120;
const REFRESH_SESSION_EXPIRATION_GRACE_SECONDS = 7 * 24 * 60 * 60;

let privateKey: KeyObject | null = null;
let publicKey: KeyObject | null = null;

interface JwtPayloadBase {
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  nbf?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface SessionTokenPayload extends JwtPayloadBase {
  typ: "session";
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface EntitlementTokenPayload extends JwtPayloadBase {
  typ: "entitlement";
  sub: string;
  email: string;
  plan: string | null;
  active: boolean;
  license_valid_until: string | null;
  subscription_status: string | null;
  paid_amount: number | null;
  paid_currency: string | null;
  watermark_required: boolean;
}

export interface DesktopCodePayload extends JwtPayloadBase {
  typ: "desktop_code";
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  nonce?: string;
}

function normalizePem(rawPem: string): string {
  return rawPem.includes("\\n") ? rawPem.replace(/\\n/g, "\n") : rawPem;
}

function getRequiredEnv(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
}

export function getAuthIssuer(): string {
  return Netlify.env.get("AUTH_ISSUER") || "recordsaas.app";
}

function getPrivateKey(): KeyObject {
  if (!privateKey) {
    privateKey = createPrivateKey(normalizePem(getRequiredEnv("AUTH_PRIVATE_KEY_PEM")));
  }
  return privateKey;
}

function getPublicKey(): KeyObject {
  if (!publicKey) {
    publicKey = createPublicKey(normalizePem(getRequiredEnv("AUTH_PUBLIC_KEY_PEM")));
  }
  return publicKey;
}

export function getPublicKeyPem(): string {
  return normalizePem(getRequiredEnv("AUTH_PUBLIC_KEY_PEM"));
}

function encodeBase64Url(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function parseJson<T>(input: Buffer): T {
  const text = input.toString("utf8");
  return JSON.parse(text) as T;
}

function ensureAudience(payloadAud: string | string[] | undefined, expectedAudience: string): boolean {
  if (!payloadAud) return false;
  if (typeof payloadAud === "string") return payloadAud === expectedAudience;
  return payloadAud.includes(expectedAudience);
}

function ensureNotExpired(payload: JwtPayloadBase): void {
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new Error("Token expired");
  }

  if (typeof payload.nbf === "number" && payload.nbf > now) {
    throw new Error("Token not active yet");
  }
}

interface VerifyTokenOptions {
  maxExpiredAgeSeconds?: number;
}

function newJti(): string {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function signToken(payload: JwtPayloadBase, audience: string, ttlSeconds: number): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claims: JwtPayloadBase = {
    ...payload,
    iss: getAuthIssuer(),
    aud: audience,
    iat: now,
    exp: now + ttlSeconds,
    jti: newJti(),
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(getPrivateKey());
  return `${unsignedToken}.${encodeBase64Url(signature)}`;
}

function verifyToken(token: string, audience: string, options?: VerifyTokenOptions): JwtPayloadBase {
  const segments = token.split(".");

  if (segments.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;

  const header = parseJson<{ alg?: string; typ?: string }>(decodeBase64Url(encodedHeader));

  if (header.alg !== "RS256" || header.typ !== "JWT") {
    throw new Error("Unsupported token header");
  }

  const verify = createVerify("RSA-SHA256");
  verify.update(`${encodedHeader}.${encodedPayload}`);
  verify.end();

  const signature = decodeBase64Url(encodedSignature);
  const isValid = verify.verify(getPublicKey(), signature);

  if (!isValid) {
    throw new Error("Invalid token signature");
  }

  const payload = parseJson<JwtPayloadBase>(decodeBase64Url(encodedPayload));

  if (payload.iss !== getAuthIssuer()) {
    throw new Error("Invalid token issuer");
  }

  if (!ensureAudience(payload.aud, audience)) {
    throw new Error("Invalid token audience");
  }

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.nbf === "number" && payload.nbf > now) {
    throw new Error("Token not active yet");
  }

  if (typeof payload.exp !== "number") {
    throw new Error("Missing token expiration");
  }

  if (typeof options?.maxExpiredAgeSeconds === "number") {
    if (payload.exp < now && now - payload.exp > options.maxExpiredAgeSeconds) {
      throw new Error("Token expired beyond refresh grace period");
    }
  } else {
    ensureNotExpired(payload);
  }

  return payload;
}

export function signSessionToken(payload: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): string {
  return signToken(
    {
      typ: "session",
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    },
    SESSION_AUDIENCE,
    SESSION_TOKEN_TTL_SECONDS,
  );
}

export function signEntitlementToken(payload: {
  sub: string;
  email: string;
  plan: string | null;
  active: boolean;
  licenseValidUntil: string | null;
  subscriptionStatus: string | null;
  paidAmount: number | null;
  paidCurrency: string | null;
  watermarkRequired: boolean;
}): string {
  return signToken(
    {
      typ: "entitlement",
      sub: payload.sub,
      email: payload.email,
      plan: payload.plan,
      active: payload.active,
      license_valid_until: payload.licenseValidUntil,
      subscription_status: payload.subscriptionStatus,
      paid_amount: payload.paidAmount,
      paid_currency: payload.paidCurrency,
      watermark_required: payload.watermarkRequired,
    },
    ENTITLEMENT_AUDIENCE,
    ENTITLEMENT_TOKEN_TTL_SECONDS,
  );
}

export function signDesktopCodeToken(payload: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  nonce?: string;
}): string {
  return signToken(
    {
      typ: "desktop_code",
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      nonce: payload.nonce,
    },
    DESKTOP_CODE_AUDIENCE,
    DESKTOP_CODE_TTL_SECONDS,
  );
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const payload = verifyToken(token, SESSION_AUDIENCE) as SessionTokenPayload;

  if (payload.typ !== "session" || typeof payload.email !== "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid session token payload");
  }

  return payload;
}

export function verifySessionTokenForRefresh(token: string): SessionTokenPayload {
  const payload = verifyToken(token, SESSION_AUDIENCE, {
    maxExpiredAgeSeconds: REFRESH_SESSION_EXPIRATION_GRACE_SECONDS,
  }) as SessionTokenPayload;

  if (payload.typ !== "session" || typeof payload.email !== "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid session token payload");
  }

  return payload;
}

export function verifyEntitlementToken(token: string): EntitlementTokenPayload {
  const payload = verifyToken(token, ENTITLEMENT_AUDIENCE) as EntitlementTokenPayload;

  if (
    payload.typ !== "entitlement" ||
    typeof payload.email !== "string" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid entitlement token payload");
  }

  return payload;
}

export function verifyDesktopCodeToken(token: string): DesktopCodePayload {
  const payload = verifyToken(token, DESKTOP_CODE_AUDIENCE) as DesktopCodePayload;

  if (payload.typ !== "desktop_code" || typeof payload.email !== "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid desktop code payload");
  }

  return payload;
}

export function parseBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  return authHeader.slice(7).trim();
}


