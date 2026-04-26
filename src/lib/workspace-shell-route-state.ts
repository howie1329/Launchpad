type WorkspacePathIds = {
	projectId: string;
	threadId: string;
	artifactId: string;
};

export function workspacePathIds(pathname: string): WorkspacePathIds {
	return {
		projectId: /^\/workspace\/project\/([^/]+)/.exec(pathname)?.[1]?.trim() ?? '',
		threadId: /^\/workspace\/thread\/([^/]+)/.exec(pathname)?.[1]?.trim() ?? '',
		artifactId: /^\/workspace\/artifacts\/([^/]+)/.exec(pathname)?.[1]?.trim() ?? ''
	};
}

export function isWorkspaceSettingsPath(pathname: string): boolean {
	return pathname === '/workspace/settings';
}

export function isWorkspaceHomePath(pathname: string): boolean {
	return pathname === '/workspace';
}
