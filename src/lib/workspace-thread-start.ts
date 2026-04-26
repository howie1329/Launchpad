import { browser } from '$app/environment';

const THREAD_START_KEY_PREFIX = 'launchpad:workspace:thread-start:';

export function markThreadForAutoStart(threadId: string) {
	if (!browser || !threadId.trim()) return;
	sessionStorage.setItem(`${THREAD_START_KEY_PREFIX}${threadId}`, '1');
}

export function consumeThreadAutoStart(threadId: string): boolean {
	if (!browser || !threadId.trim()) return false;
	const key = `${THREAD_START_KEY_PREFIX}${threadId}`;
	const shouldStart = sessionStorage.getItem(key) === '1';
	if (shouldStart) {
		sessionStorage.removeItem(key);
	}
	return shouldStart;
}
