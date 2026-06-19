import type { LaunchpadActionProvider } from './launchpad-actions';

export type LaunchpadActionSourceKind = 'github_repository' | 'linear_project' | 'linear_team';

export function buildPresetSource(
	provider: LaunchpadActionProvider,
	sourceKind: LaunchpadActionSourceKind,
	sourceValue: string,
	sourceNameValue: string
):
	| {
			ok: true;
			sourceId: string;
			sourceName: string;
			triggerConfig: Record<string, unknown>;
	  }
	| { ok: false; error: string } {
	if (!sourceValue) {
		return {
			ok: false,
			error: provider === 'github' ? 'Repository is required' : 'Source id is required'
		};
	}

	if (sourceKind === 'github_repository') {
		const [owner, repo, extra] = sourceValue.split('/').map((part) => part.trim());
		if (!owner || !repo || extra) {
			return { ok: false, error: 'Repository must use owner/repo format' };
		}
		const repository = `${owner}/${repo}`;
		return {
			ok: true,
			sourceId: repository,
			sourceName: repository,
			triggerConfig: { owner, repo }
		};
	}

	const sourceId = sourceValue;
	const sourceName = sourceNameValue || sourceValue;
	return {
		ok: true,
		sourceId,
		sourceName,
		triggerConfig: sourceKind === 'linear_team' ? { team_id: sourceId } : { project_id: sourceId }
	};
}

export function triggerRequiresConfigKey(
	trigger: { config?: Record<string, unknown> },
	key: string
) {
	const required = trigger.config?.required;
	return Array.isArray(required) && required.includes(key);
}

export function missingRequiredConfigKeys(
	trigger: { config?: Record<string, unknown> },
	triggerConfig: Record<string, unknown>
) {
	const required = trigger.config?.required;
	if (!Array.isArray(required)) return [];
	return required.filter(
		(key): key is string => typeof key === 'string' && !(key in triggerConfig)
	);
}
