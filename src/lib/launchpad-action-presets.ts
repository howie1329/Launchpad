import type { LaunchpadActionProvider, LaunchpadActionSourceKind } from '$lib/launchpad-actions';

export type LaunchpadActionPresetId =
	| 'github_repository_activity'
	| 'github_issues'
	| 'github_pull_requests'
	| 'linear_project'
	| 'linear_team';

export type LaunchpadActionEventId =
	| 'github_commit_pushed'
	| 'github_issue_created'
	| 'github_issue_updated'
	| 'github_issue_commented'
	| 'github_pr_opened'
	| 'github_pr_merged'
	| 'github_pr_commented'
	| 'linear_issue_created'
	| 'linear_issue_updated'
	| 'linear_comment_received';

export type LaunchpadActionPreset = {
	id: LaunchpadActionPresetId;
	label: string;
	description: string;
	provider: LaunchpadActionProvider;
	sourceKind: LaunchpadActionSourceKind;
	sourceLabel: string;
	sourcePlaceholder: string;
	sourceHelp: string;
	events: LaunchpadActionEvent[];
};

export type LaunchpadActionEvent = {
	id: LaunchpadActionEventId;
	label: string;
	matchAll: string[];
	matchAny?: string[];
	optionalConfigKeys?: string[];
};

export const launchpadActionPresets: LaunchpadActionPreset[] = [
	{
		id: 'github_repository_activity',
		label: 'Track GitHub repository activity',
		description: 'Capture commits and broad repository progress.',
		provider: 'github',
		sourceKind: 'github_repository',
		sourceLabel: 'Repository',
		sourcePlaceholder: 'owner/repo',
		sourceHelp: 'Use the GitHub owner and repository name.',
		events: [
			{
				id: 'github_commit_pushed',
				label: 'Commits pushed',
				matchAll: ['github'],
				matchAny: ['commit', 'push', 'branch changed'],
				optionalConfigKeys: ['branch']
			}
		]
	},
	{
		id: 'github_issues',
		label: 'Track GitHub issues',
		description: 'Capture issue creation, updates, and comments.',
		provider: 'github',
		sourceKind: 'github_repository',
		sourceLabel: 'Repository',
		sourcePlaceholder: 'owner/repo',
		sourceHelp: 'Use the GitHub owner and repository name.',
		events: [
			{
				id: 'github_issue_created',
				label: 'Issue created',
				matchAll: ['github', 'issue'],
				matchAny: ['created', 'opened', 'new']
			},
			{
				id: 'github_issue_updated',
				label: 'Issue updated',
				matchAll: ['github', 'issue'],
				matchAny: ['updated', 'edited', 'changed']
			},
			{
				id: 'github_issue_commented',
				label: 'Issue comment',
				matchAll: ['github', 'issue', 'comment']
			}
		]
	},
	{
		id: 'github_pull_requests',
		label: 'Track GitHub pull requests',
		description: 'Capture pull request creation, merges, and comments.',
		provider: 'github',
		sourceKind: 'github_repository',
		sourceLabel: 'Repository',
		sourcePlaceholder: 'owner/repo',
		sourceHelp: 'Use the GitHub owner and repository name.',
		events: [
			{
				id: 'github_pr_opened',
				label: 'Pull request opened',
				matchAll: ['github'],
				matchAny: ['pull request opened', 'pull_request_opened', 'pr opened']
			},
			{
				id: 'github_pr_merged',
				label: 'Pull request merged',
				matchAll: ['github'],
				matchAny: ['pull request merged', 'pull_request_merged', 'pr merged']
			},
			{
				id: 'github_pr_commented',
				label: 'Pull request comment',
				matchAll: ['github', 'comment'],
				matchAny: ['pull request', 'pull_request', 'pr']
			}
		]
	},
	{
		id: 'linear_project',
		label: 'Track Linear project',
		description: 'Capture issue and comment activity for one Linear project.',
		provider: 'linear',
		sourceKind: 'linear_project',
		sourceLabel: 'Project id',
		sourcePlaceholder: 'project-id-or-key',
		sourceHelp: 'Use the Linear project id or key.',
		events: [
			{
				id: 'linear_issue_created',
				label: 'Issue created',
				matchAll: ['linear', 'issue'],
				matchAny: ['created', 'new']
			},
			{
				id: 'linear_issue_updated',
				label: 'Issue updated',
				matchAll: ['linear', 'issue'],
				matchAny: ['updated', 'changed']
			},
			{
				id: 'linear_comment_received',
				label: 'Comment received',
				matchAll: ['linear', 'comment']
			}
		]
	},
	{
		id: 'linear_team',
		label: 'Track Linear team',
		description: 'Capture issue and comment activity for one Linear team.',
		provider: 'linear',
		sourceKind: 'linear_team',
		sourceLabel: 'Team id',
		sourcePlaceholder: 'team-id-or-key',
		sourceHelp: 'Use the Linear team id or key.',
		events: [
			{
				id: 'linear_issue_created',
				label: 'Issue created',
				matchAll: ['linear', 'issue'],
				matchAny: ['created', 'new']
			},
			{
				id: 'linear_issue_updated',
				label: 'Issue updated',
				matchAll: ['linear', 'issue'],
				matchAny: ['updated', 'changed']
			},
			{
				id: 'linear_comment_received',
				label: 'Comment received',
				matchAll: ['linear', 'comment']
			}
		]
	}
];

export function findLaunchpadActionPreset(value: unknown) {
	return launchpadActionPresets.find((preset) => preset.id === value);
}

export function findLaunchpadActionEvent(preset: LaunchpadActionPreset, value: unknown) {
	return preset.events.find((event) => event.id === value);
}

export function launchpadActionEventLabel(eventId: string) {
	for (const preset of launchpadActionPresets) {
		const event = preset.events.find((item) => item.id === eventId);
		if (event) return event.label;
	}
	return '';
}
