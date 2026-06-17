import { describe, expect, it } from 'vitest';

import {
	buildPresetSource,
	missingRequiredConfigKeys,
	triggerRequiresConfigKey
} from './launchpad-action-request';

describe('buildPresetSource', () => {
	it('accepts GitHub repositories in owner/repo format', () => {
		expect(buildPresetSource('github', 'github_repository', ' owner / repo ', '')).toEqual({
			ok: true,
			sourceId: 'owner/repo',
			sourceName: 'owner/repo',
			triggerConfig: { owner: 'owner', repo: 'repo' }
		});
	});

	it.each([
		['', 'Repository is required'],
		['owner', 'Repository must use owner/repo format'],
		['owner/repo/extra', 'Repository must use owner/repo format']
	])('rejects invalid GitHub repository value %j', (sourceValue, error) => {
		expect(buildPresetSource('github', 'github_repository', sourceValue, '')).toEqual({
			ok: false,
			error
		});
	});

	it('preserves Linear project ids and names', () => {
		expect(buildPresetSource('linear', 'linear_project', 'project-id', 'Project Name')).toEqual({
			ok: true,
			sourceId: 'project-id',
			sourceName: 'Project Name',
			triggerConfig: { project_id: 'project-id' }
		});
	});

	it('preserves Linear team ids and falls back to id for name', () => {
		expect(buildPresetSource('linear', 'linear_team', 'team-id', '')).toEqual({
			ok: true,
			sourceId: 'team-id',
			sourceName: 'team-id',
			triggerConfig: { team_id: 'team-id' }
		});
	});
});

describe('Launchpad Action config helpers', () => {
	it('detects required config keys', () => {
		const trigger = { config: { required: ['owner', 'repo'] } };

		expect(triggerRequiresConfigKey(trigger, 'owner')).toBe(true);
		expect(triggerRequiresConfigKey(trigger, 'branch')).toBe(false);
	});

	it('reports missing required config keys without broadening accepted input', () => {
		const trigger = { config: { required: ['owner', 'repo', 'branch', 123] } };

		expect(missingRequiredConfigKeys(trigger, { owner: 'acme', repo: 'app' })).toEqual(['branch']);
		expect(missingRequiredConfigKeys({ config: { required: 'owner' } }, {})).toEqual([]);
	});
});
