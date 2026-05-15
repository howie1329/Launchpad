import { env } from '$env/dynamic/private';
import Supermemory from 'supermemory';

let client: Supermemory | null = null;

export function getSupermemoryClient(): Supermemory | null {
	const apiKey = env.SUPERMEMORY_API_KEY?.trim();
	if (!apiKey) return null;

	client ??= new Supermemory({ apiKey });
	return client;
}
