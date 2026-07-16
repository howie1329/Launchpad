export type WorkspaceArtifactChrome = {
	onBack?: () => void;
	surfaceMode: 'read' | 'history';
	readMode: 'read' | 'edit';
	canHistory: boolean;
	contentDirty: boolean;
	isSaving: boolean;
	saveError: boolean;
	saveStateLabel: string;
	canSave: boolean;
	setRead: () => void;
	setHistory: () => void;
	setReadMode: () => void;
	setEditMode: () => void;
	save: () => void;
};

/** Mutable ref so importers can update without reassigning the module binding. */
export const workspaceArtifactChrome = $state<{
	value: WorkspaceArtifactChrome | null;
}>({ value: null });
