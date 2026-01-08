import type { GetAuthResponse } from "@planner/schemas/user";
import { CompactEncrypt, compactDecrypt, importPKCS8, importSPKI } from "jose";

export type AuthCookiePayload = GetAuthResponse & {
	iat: number;
	exp: number;
};

interface EncryptedCookie {
	data: string; // contains a compact JWE string, wrapped by outer base64(JSON)
	v: number;
}

const COOKIE_VERSION = 1;
const DEFAULT_EXPIRY_HOURS = 24 * 7; // 7 days

/**
 * Encrypts an auth cookie payload using RSA-OAEP-256 and A256GCM encryption.
 * @param payload - The authentication payload to encrypt (without iat/exp)
 * @param publicKeyPem - RSA public key in PEM format (SPKI)
 * @param expiryHours - Cookie expiration time in hours (default: 7 days)
 * @returns Base64-encoded encrypted cookie string
 */
export async function encryptAuthCookie(
	payload: Omit<AuthCookiePayload, "iat" | "exp">,
	publicKeyPem: string,
	expiryHours = DEFAULT_EXPIRY_HOURS,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const full: AuthCookiePayload = {
		...payload,
		exp: now + expiryHours * 3600,
		iat: now,
	};
	const plaintext = new TextEncoder().encode(JSON.stringify(full));

	// Import RSA public key (SPKI PEM)
	const publicKey = await importSPKI(publicKeyPem, "RSA-OAEP-256");

	// Create a compact JWE: RSA-OAEP-256 (key wrap) + A256GCM (content)
	const jwe = await new CompactEncrypt(plaintext)
		.setProtectedHeader({
			alg: "RSA-OAEP-256",
			enc: "A256GCM",
		})
		.encrypt(publicKey);

	// Keep your outer type: base64(JSON({ v, data }))
	const cookie: EncryptedCookie = { data: jwe, v: COOKIE_VERSION };
	return Buffer.from(JSON.stringify(cookie), "utf-8").toString("base64");
}

/**
 * Decrypts an auth cookie and validates its contents.
 * @param encryptedCookie - Base64-encoded encrypted cookie string
 * @param privateKeyPem - RSA private key in PEM format (PKCS#8)
 * @returns Decrypted and validated auth cookie payload
 * @throws Error if decryption fails, cookie is expired, or payload is invalid
 */
export async function decryptAuthCookie(
	encryptedCookie: string,
	privateKeyPem: string,
): Promise<AuthCookiePayload> {
	// Outer decode
	const json = Buffer.from(encryptedCookie, "base64").toString("utf-8");
	const cookie: EncryptedCookie = JSON.parse(json);
	if (cookie.v !== COOKIE_VERSION)
		throw new Error(`Unsupported cookie version: ${cookie.v}`);

	// Import RSA private key (PKCS#8 PEM)
	const privateKey = await importPKCS8(privateKeyPem, "RSA-OAEP-256");

	// Decrypt compact JWE
	const { plaintext } = await compactDecrypt(cookie.data, privateKey);
	const payload: AuthCookiePayload = JSON.parse(
		new TextDecoder().decode(plaintext),
	);

	// Validate minimal claims
	const now = Math.floor(Date.now() / 1000);
	if (payload.exp < now) throw new Error("Auth cookie has expired");
	if (!(payload.user.id && payload.user.email)) {
		throw new Error("Invalid auth cookie payload: missing required fields");
	}
	return payload;
}

/**
 * Checks if an auth cookie is expired without fully validating it.
 * @param encryptedCookie - Base64-encoded encrypted cookie string
 * @param privateKeyPem - RSA private key in PEM format (PKCS#8)
 * @returns true if cookie is expired or invalid, false otherwise
 */
export async function isAuthCookieExpired(
	encryptedCookie: string,
	privateKeyPem: string,
): Promise<boolean> {
	try {
		const p = await decryptAuthCookie(encryptedCookie, privateKeyPem);
		return p.exp < Math.floor(Date.now() / 1000);
	} catch {
		return true;
	}
}
