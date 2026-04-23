import { createHash, randomBytes } from "node:crypto";
export function generateToken() {
	const text = randomBytes(32).toString("hex");

	const hash = createHash("sha256").update(text).digest("hex");
	return { hash, text };
}
