export function protoTimeStampToDate(ts?: { seconds: bigint; nanos: number }) {
	if (!ts) return null;
	return new Date(Number(ts.seconds) * 1000 + ts.nanos / 1_000_000);
}

export function dateToProtoTimestamp(
	date?: Date | null,
): { seconds: bigint; nanos: number } | null {
	if (!date) return null;
	const ms = date.getTime();
	let seconds = Math.floor(ms / 1000);
	let nanos = (ms - seconds * 1000) * 1_000_000;
	if (nanos < 0) {
		seconds -= 1;
		nanos += 1_000_000_000;
	}
	return { nanos, seconds: BigInt(seconds) };
}
