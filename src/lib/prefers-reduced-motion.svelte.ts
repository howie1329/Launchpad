import { MediaQuery } from 'svelte/reactivity';

/**
 * `prefers-reduced-motion: reduce` — `false` during SSR.
 * Read `prefersReducedMotion.current` inside `$derived` when passing to transitions.
 */
export const prefersReducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)', false);
