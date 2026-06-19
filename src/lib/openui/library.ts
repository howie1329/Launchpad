import { createLibrary, defineComponent, type ComponentRenderer } from '@openuidev/svelte-lang';
import OpenUIAccordion from './components/OpenUIAccordion.svelte';
import OpenUIBadge from './components/OpenUIBadge.svelte';
import OpenUIBarChart from './components/OpenUIBarChart.svelte';
import OpenUIButton from './components/OpenUIButton.svelte';
import OpenUICallout from './components/OpenUICallout.svelte';
import OpenUICard from './components/OpenUICard.svelte';
import OpenUIChoice from './components/OpenUIChoice.svelte';
import OpenUIForm from './components/OpenUIForm.svelte';
import OpenUIGrid from './components/OpenUIGrid.svelte';
import OpenUIHeading from './components/OpenUIHeading.svelte';
import OpenUIList from './components/OpenUIList.svelte';
import OpenUIMetadata from './components/OpenUIMetadata.svelte';
import OpenUIProgress from './components/OpenUIProgress.svelte';
import OpenUIRoot from './components/OpenUIRoot.svelte';
import OpenUISeparator from './components/OpenUISeparator.svelte';
import OpenUIStack from './components/OpenUIStack.svelte';
import OpenUITable from './components/OpenUITable.svelte';
import OpenUIText from './components/OpenUIText.svelte';
import OpenUITextInput from './components/OpenUITextInput.svelte';
import OpenUITimeline from './components/OpenUITimeline.svelte';
import { openUIComponentDefinitions } from './definitions';

const renderers: Record<string, ComponentRenderer<never>> = {
	Root: OpenUIRoot,
	Stack: OpenUIStack,
	Grid: OpenUIGrid,
	Text: OpenUIText,
	Heading: OpenUIHeading,
	Card: OpenUICard,
	Callout: OpenUICallout,
	List: OpenUIList,
	Metadata: OpenUIMetadata,
	Badge: OpenUIBadge,
	Table: OpenUITable,
	BarChart: OpenUIBarChart,
	Progress: OpenUIProgress,
	Form: OpenUIForm,
	TextInput: OpenUITextInput,
	Choice: OpenUIChoice,
	Button: OpenUIButton,
	Separator: OpenUISeparator,
	Timeline: OpenUITimeline,
	Accordion: OpenUIAccordion
};

export const library = createLibrary({
	components: openUIComponentDefinitions.map((definition) =>
		defineComponent({
			...definition,
			component: renderers[definition.name] as unknown as ComponentRenderer<Record<string, unknown>>
		})
	),
	root: 'Root'
});
