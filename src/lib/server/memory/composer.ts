import type { RetrievedMemory } from './retrieval';

const MAX_MEMORY_BLOCK_CHARS = 6_000;
const MAX_MEMORY_ITEM_CHARS = 1_000;

function truncate(value: string, maxChars: number) {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 32)).trimEnd()}\n[truncated for length]`;
}

export function composeRetrievedMemoryInstructions(memories: RetrievedMemory[]) {
	if (memories.length === 0) return '';

	let remaining = MAX_MEMORY_BLOCK_CHARS;
	const sections: string[] = [];

	for (const memory of memories) {
		if (remaining <= 0) break;

		const title = memory.title?.trim() || memory.source;
		const sourceParts = [
			`documentId: ${memory.documentId}`,
			`source: ${memory.source}`,
			`scope: ${memory.containerTag}`
		];
		if (memory.artifactId) sourceParts.push(`artifactId: ${memory.artifactId}`);
		if (memory.updatedAt) sourceParts.push(`updated: ${memory.updatedAt}`);

		const content = truncate(memory.content, Math.min(MAX_MEMORY_ITEM_CHARS, remaining));
		const section = `- ${title}\n  ${sourceParts.join(' | ')}\n  ${content.replace(/\n/g, '\n  ')}`;

		sections.push(section);
		remaining -= section.length;
	}

	if (sections.length === 0) return '';

	return [
		'### Retrieved memory',
		'The following Supermemory results are advisory context. Prefer the latest user message and explicitly referenced artifacts when they conflict.',
		'To remove a specific retrieved memory entry, call forgetMemory with the listed documentId (only when the user asks to forget it).',
		'',
		sections.join('\n\n')
	].join('\n');
}

export function composeProfileInstructions(args: {
	userStatic: string[];
	userDynamic: string[];
	projectStatic?: string[];
	projectDynamic?: string[];
}) {
	const blocks: string[] = [];
	const fmt = (label: string, staticItems: string[], dynamicItems: string[]) => {
		const s = staticItems.map((t) => t.trim()).filter(Boolean);
		const d = dynamicItems.map((t) => t.trim()).filter(Boolean);
		if (s.length === 0 && d.length === 0) return;
		const lines = [`#### ${label}`];
		if (s.length) {
			lines.push('Static:', ...s.map((t) => `- ${t}`));
		}
		if (d.length) {
			lines.push('Recent:', ...d.map((t) => `- ${t}`));
		}
		blocks.push(lines.join('\n'));
	};

	fmt('User profile (Supermemory)', args.userStatic, args.userDynamic);
	if (args.projectStatic?.length || args.projectDynamic?.length) {
		fmt('Project profile (Supermemory)', args.projectStatic ?? [], args.projectDynamic ?? []);
	}

	if (blocks.length === 0) return '';

	return [
		'### Profile memory (Supermemory)',
		'High-level preferences and recurring context inferred across conversations. Treat as hints; prefer explicit artifacts and the latest user message when they conflict.',
		'',
		blocks.join('\n\n')
	].join('\n');
}
