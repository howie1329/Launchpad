export function safeTimeZone(timeZone: string | undefined) {
	if (!timeZone) return 'UTC';

	try {
		// Throws on invalid IANA timezone.
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
		return timeZone;
	} catch {
		return 'UTC';
	}
}

export function dateKeyForMs(ms: number, timeZone: string | undefined) {
	const tz = safeTimeZone(timeZone);
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(ms));
}
