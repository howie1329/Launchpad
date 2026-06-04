/** Composio toolkit allowlist shared by server, UI, evals, and instructions (no SvelteKit env imports). */

export const ALLOWED_COMPOSIO_TOOLKITS = [
	'github',
	'linear',
	'slack',
	'gmail',
	'notion',
	'googledrive',
	'googledocs',
	'googlecalendar',
	'googlesheets'
] as const;

export type AllowedComposioToolkit = (typeof ALLOWED_COMPOSIO_TOOLKITS)[number];
export type LaunchpadActionToolkit = Extract<AllowedComposioToolkit, 'github' | 'linear'>;

export function isAllowedComposioToolkit(value: unknown): value is AllowedComposioToolkit {
	return (
		typeof value === 'string' &&
		ALLOWED_COMPOSIO_TOOLKITS.includes(value.toLowerCase() as AllowedComposioToolkit)
	);
}

export function composioToolkitLabel(toolkit: AllowedComposioToolkit): string {
	const names: Record<AllowedComposioToolkit, string> = {
		github: 'GitHub',
		linear: 'Linear',
		slack: 'Slack',
		gmail: 'Gmail',
		notion: 'Notion',
		googledrive: 'Google Drive',
		googledocs: 'Google Docs',
		googlecalendar: 'Google Calendar',
		googlesheets: 'Google Sheets'
	};
	return names[toolkit];
}
