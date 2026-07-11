export const COLOR_THEME_STORAGE_KEY = 'launchpad-color-theme';
export const DEFAULT_COLOR_THEME = 'standard' as const;

export type ColorThemeId = 'standard' | 'vercel' | 'codex' | 'claude';

export type ColorTheme = {
	id: ColorThemeId;
	name: string;
	description: string;
	swatches: readonly string[];
};

export const COLOR_THEMES: readonly ColorTheme[] = [
	{
		id: 'standard',
		name: 'Standard',
		description: 'Quiet neutral tones for the default Launchpad workbench.',
		swatches: ['#171717', '#ffffff', '#a3a3a3']
	},
	{
		id: 'vercel',
		name: 'Vercel',
		description: 'High-contrast monochrome with a cool graphite edge.',
		swatches: ['#18181b', '#fafafa', '#71717a']
	},
	{
		id: 'codex',
		name: 'Codex',
		description: 'Graphite surfaces with a restrained teal action color.',
		swatches: ['#176b67', '#f4fbfa', '#51b9af']
	},
	{
		id: 'claude',
		name: 'Claude',
		description: 'Warm charcoal surfaces with a muted orange accent.',
		swatches: ['#a34f22', '#fffaf5', '#d9824d']
	}
] as const;

const colorThemeIds = new Set<ColorThemeId>(COLOR_THEMES.map((theme) => theme.id));

export function isColorThemeId(value: unknown): value is ColorThemeId {
	return typeof value === 'string' && colorThemeIds.has(value as ColorThemeId);
}

export function getColorTheme(): ColorThemeId {
	if (typeof window === 'undefined') return DEFAULT_COLOR_THEME;

	try {
		const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
		return isColorThemeId(stored) ? stored : DEFAULT_COLOR_THEME;
	} catch {
		return DEFAULT_COLOR_THEME;
	}
}

export function applyColorTheme(theme: ColorThemeId) {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.colorTheme = theme;
}

export function setColorTheme(theme: ColorThemeId) {
	if (typeof window === 'undefined') return;

	applyColorTheme(theme);

	try {
		window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
	} catch {
		// Private browsing and restricted storage should not block theme switching.
	}

	window.dispatchEvent(
		new CustomEvent<ColorThemeId>('launchpad:color-theme-change', { detail: theme })
	);
}
