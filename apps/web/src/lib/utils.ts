import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function protoTimeStampToDate(ts?: { seconds: bigint; nanos: number }) {
	if (!ts) return null;
	return new Date(Number(ts.seconds) * 1000 + ts.nanos / 1_000_000);
}
