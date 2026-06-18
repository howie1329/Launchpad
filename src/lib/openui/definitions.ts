import type { PromptOptions } from '@openuidev/lang-core';
import { z } from 'zod';

const children = z.array(z.any()).describe('Child OpenUI components.');
const tone = z.enum(['neutral', 'info', 'warning', 'success']).optional();

export type OpenUIComponentDefinition = {
	name: string;
	description: string;
	props: z.ZodObject<z.ZodRawShape>;
};

export const openUIComponentDefinitions: readonly OpenUIComponentDefinition[] = [
	{
		name: 'Root',
		description: 'Required root container for every response.',
		props: z.object({ children })
	},
	{
		name: 'Stack',
		description: 'Arranges child components in a row or column.',
		props: z.object({
			children,
			direction: z.enum(['row', 'column']).optional(),
			gap: z.enum(['small', 'medium', 'large']).optional()
		})
	},
	{
		name: 'Grid',
		description: 'Responsive grid for related peer content.',
		props: z.object({
			children,
			columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
		})
	},
	{
		name: 'Text',
		description: 'Markdown-capable prose. Use for normal answers, explanations, and code.',
		props: z.object({ content: z.string(), muted: z.boolean().optional() })
	},
	{
		name: 'Heading',
		description: 'Compact section heading.',
		props: z.object({
			text: z.string(),
			level: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional()
		})
	},
	{
		name: 'Card',
		description: 'Bounded container for a meaningful group. Avoid nesting cards.',
		props: z.object({
			title: z.string().optional(),
			description: z.string().optional(),
			children: children.optional()
		})
	},
	{
		name: 'Callout',
		description: 'Highlights a decision, warning, success, or important note.',
		props: z.object({ body: z.string(), title: z.string().optional(), tone })
	},
	{
		name: 'List',
		description: 'Ordered or unordered list of concise text items.',
		props: z.object({ items: z.array(z.string()), ordered: z.boolean().optional() })
	},
	{
		name: 'Metadata',
		description: 'Compact label-value facts.',
		props: z.object({ items: z.array(z.object({ label: z.string(), value: z.string() })) })
	},
	{
		name: 'Badge',
		description: 'Short status or category label.',
		props: z.object({ label: z.string(), tone })
	},
	{
		name: 'Table',
		description: 'Compact comparison or structured dataset. Keep tables small enough for chat.',
		props: z.object({
			columns: z.array(z.string()),
			rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean()])))
		})
	},
	{
		name: 'BarChart',
		description: 'Simple horizontal bar chart for comparing numeric values.',
		props: z.object({
			items: z.array(z.object({ label: z.string(), value: z.number() })),
			title: z.string().optional()
		})
	},
	{
		name: 'Progress',
		description: 'Shows completion or proportion for one metric.',
		props: z.object({ label: z.string(), value: z.number(), max: z.number().optional() })
	},
	{
		name: 'Form',
		description: 'Groups text inputs and a Button. The Button formName must match Form name.',
		props: z.object({ name: z.string(), children, title: z.string().optional() })
	},
	{
		name: 'TextInput',
		description: 'Text field inside a Form. Values are sent only when the user presses a Button.',
		props: z.object({
			label: z.string(),
			name: z.string(),
			placeholder: z.string().optional(),
			value: z.string().optional(),
			multiline: z.boolean().optional()
		})
	},
	{
		name: 'Choice',
		description:
			'Two or three selectable answers. Selecting one sends its answer to the assistant.',
		props: z.object({
			question: z.string(),
			options: z
				.array(
					z.object({
						label: z.string(),
						answer: z.string(),
						description: z.string().optional()
					})
				)
				.min(2)
				.max(3),
			context: z.string().optional()
		})
	},
	{
		name: 'Button',
		description:
			'Sends an allowlisted follow-up message to the assistant. It never calls tools directly.',
		props: z.object({
			label: z.string(),
			message: z.string(),
			formName: z.string().optional(),
			variant: z.enum(['primary', 'secondary']).optional()
		})
	},
	{
		name: 'Separator',
		description: 'Visual break between sections inside a Stack.',
		props: z.object({ orientation: z.enum(['horizontal', 'vertical']).optional() })
	},
	{
		name: 'Timeline',
		description: 'Vertical phased plan or milestone list for roadmaps and next steps.',
		props: z.object({
			items: z.array(
				z.object({
					title: z.string(),
					description: z.string().optional(),
					date: z.string().optional(),
					status: z.enum(['completed', 'current', 'upcoming']).optional()
				})
			)
		})
	},
	{
		name: 'Accordion',
		description: 'Single collapsible section for optional detail. Default closed.',
		props: z.object({ title: z.string(), children: children.optional() })
	}
];

export const promptOptions: PromptOptions = {
	preamble:
		"You are Launchpad's workspace assistant. Call server-side tools before your final OpenUI Lang response when needed. After completing any server-side tool calls, your entire final response must be valid openui-lang code.",
	toolCalls: false,
	bindings: false,
	additionalRules: [
		'WORKFLOW: tools first when needed, then OpenUI Lang only — never raw markdown or prose outside the program.',
		'Never call requestUserChoice; use the Choice component instead.',
		'Always define root first so the response renders immediately while streaming.',
		'Use Root([children]) for every response, including short conversational replies.',
		'Use Text for ordinary prose. Keep the interface compact and avoid unnecessary cards.',
		'For substantive answers, prefer structured components (Table, BarChart, Metadata, Card) when they clarify comparisons, metrics, or plans.',
		'Use Choice instead of writing numbered multiple-choice options.',
		'Buttons and choices may only continue the conversation. Never generate Query, Mutation, @Run, or @OpenUrl.',
		'Do not claim an artifact, project, memory, or external action changed unless a server-side tool already completed it.',
		'Keep tables and charts concise enough to read inside a chat column.'
	],
	examples: [
		'root = Root([answer])\nanswer = Text("Good morning. What are you working through today?")',
		'root = Root([heading, options])\nheading = Text("The smallest useful version has three parts:")\noptions = List(["Capture the idea", "Test the riskiest assumption", "Save the decision"], true)',
		'root = Root([choice])\nchoice = Choice("Which direction should we use?", [{label: "Focused MVP", answer: "Use the focused MVP", description: "Ship one complete workflow."}, {label: "Broader beta", answer: "Use the broader beta", description: "Include the supporting workflows."}], "The first option keeps the scope smallest.")',
		'root = Root([summary, facts, table])\nsummary = Text("Here is a compact comparison of the three options.")\nfacts = Metadata([{label: "Recommended", value: "Option B"}, {label: "Risk", value: "Medium"}])\ntable = Table(["Option", "Effort", "Upside"], [["A", "Low", "Small"], ["B", "Medium", "Strong"], ["C", "High", "Largest"]])',
		'root = Root([intro, timeline])\nintro = Text("Here is a phased rollout plan.")\ntimeline = Timeline([{title: "Validate the problem", description: "Talk to 5 target users", status: "completed"}, {title: "Ship the MVP", description: "One complete workflow", status: "current"}, {title: "Expand scope", description: "Add supporting workflows", status: "upcoming"}])',
		'root = Root([choice, form])\nchoice = Choice("Which audience should we target first?", [{label: "Solo builders", answer: "Target solo builders first"}, {label: "Small teams", answer: "Target small teams first"}])\nform = Form("custom-audience", [otherInput, submitBtn], "Or describe another audience")\notherInput = TextInput("Other audience", "audience", "Tell me more...")\nsubmitBtn = Button("Other — tell me more", "I want to target a different audience", "custom-audience")'
	]
};
