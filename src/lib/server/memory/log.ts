const MAX_LOG_STRING = 200

function truncateStrings(_key: string, value: unknown): unknown {
	if (typeof value === 'string' && value.length > MAX_LOG_STRING) {
		return `${value.slice(0, MAX_LOG_STRING)}…[${value.length} chars]`
	}
	return value
}

/** Lightweight structured logs for Supermemory paths (no long string dumps). */
export function memoryLog(
	event: string,
	payload: Record<string, unknown>,
	level: 'info' | 'warn' = 'info'
) {
	const line = JSON.stringify({ event, ...payload }, truncateStrings)
	if (level === 'warn') console.warn(line)
	else console.info(line)
}
