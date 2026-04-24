export type WorkspaceArtifactChrome = {
	onBack?: () => void;
	surfaceMode: 'read' | 'history';
	canHistory: boolean;
	setRead: () => void;
	setHistory: () => void;
};

/** Mutable ref so importers can update without reassigning the module binding. */
export const workspaceArtifactChrome = $state<{
	value: WorkspaceArtifactChrome | null;
}>({ value: null });
