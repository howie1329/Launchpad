export const MEMORY_SEARCH_TIMEOUT_MS = 800
export const PROFILE_TIMEOUT_MS = 1_200

export function errorMessage(error: unknown) {
	return error instanceof Error && error.message ? error.message : 'Unknown Supermemory error'
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error('Supermemory request timed out')), timeoutMs)
		})
	])
}
