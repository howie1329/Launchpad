export type WorkspaceArtifactChrome = {
	onBack?: () => void
	surfaceMode: 'read' | 'compare'
	canCompare: boolean
	setRead: () => void
	setCompare: () => void
}

/** Mutable ref so importers can update without reassigning the module binding. */
export const workspaceArtifactChrome = $state<{
	value: WorkspaceArtifactChrome | null
}>({ value: null })
