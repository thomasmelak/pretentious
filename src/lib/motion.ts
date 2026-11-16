import { prefersReducedMotion } from 'svelte/motion';

/** A duration that collapses to nothing for people who ask for less motion. */
export const calm = (ms: number) => (prefersReducedMotion.current ? 0 : ms);
