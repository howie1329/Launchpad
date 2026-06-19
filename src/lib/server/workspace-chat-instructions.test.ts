import { describe, expect, it } from 'vitest';
import {
	buildFullWorkspaceChatInstructions,
	buildWorkspaceChatInstructions,
	workspaceChatBaseInstructions
} from './workspace-chat-instructions';

describe('buildFullWorkspaceChatInstructions', () => {
	it('places the OpenUI contract before workspace policy', () => {
		const instructions = buildFullWorkspaceChatInstructions({
			project: null,
			referencedBlock: '',
			profileBlock: '',
			memoryBlock: '',
			webSearchRequested: false,
			webSearchAvailable: false,
			composioToolkits: [],
			composioAvailable: false,
			userSettings: null
		});

		const openuiIndex = instructions.indexOf('valid openui-lang code');
		const policyIndex = instructions.indexOf('Workspace policy for Launchpad');
		expect(openuiIndex).toBeGreaterThanOrEqual(0);
		expect(policyIndex).toBeGreaterThan(openuiIndex);
		expect(instructions).toContain('root = Root');
	});

	it('appends user settings after the combined prompt', () => {
		const instructions = buildFullWorkspaceChatInstructions({
			project: null,
			referencedBlock: '',
			profileBlock: '',
			memoryBlock: '',
			webSearchRequested: false,
			webSearchAvailable: false,
			composioToolkits: [],
			composioAvailable: false,
			userSettings: { aiBehaviorMarkdown: 'Prefer concise recommendations.' }
		});

		expect(instructions.indexOf('User-supplied response preferences')).toBeGreaterThan(
			instructions.indexOf('Workspace policy for Launchpad')
		);
	});
});

describe('workspaceChatBaseInstructions', () => {
	it('is OpenUI-first and no longer prose-default', () => {
		expect(workspaceChatBaseInstructions).toContain('Response format');
		expect(workspaceChatBaseInstructions).toContain('Workflow');
		expect(workspaceChatBaseInstructions).toContain('OpenUI Choice');
		expect(workspaceChatBaseInstructions).toContain('Do not call requestUserChoice');
		expect(workspaceChatBaseInstructions).not.toContain('Default to 1-3 short paragraphs');
	});
});

describe('buildWorkspaceChatInstructions', () => {
	it('returns workspace policy without duplicating the OpenUI contract', () => {
		const instructions = buildWorkspaceChatInstructions({
			project: null,
			referencedBlock: '',
			profileBlock: '',
			memoryBlock: '',
			webSearchRequested: false,
			webSearchAvailable: false,
			composioToolkits: [],
			composioAvailable: false,
			userSettings: { aiContextMarkdown: 'I build SaaS tools.' }
		});

		expect(instructions).toContain('Workspace policy for Launchpad');
		expect(instructions).not.toContain('valid openui-lang code');
		expect(instructions).not.toContain('User-supplied context');
	});
});
