import { createLibrary, defineComponent } from '@openuidev/lang-core';
import { openUIComponentDefinitions } from './definitions';

export const library = createLibrary({
	components: openUIComponentDefinitions.map((definition) =>
		defineComponent({ ...definition, component: null })
	),
	root: 'Root'
});

export { promptOptions } from './definitions';
