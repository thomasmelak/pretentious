<!-- A number that glides to its new value instead of jumping. -->
<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';

	let { value, currency }: { value: number; currency?: string } = $props();

	const tween = Tween.of(() => value, { duration: calm(500), easing: cubicOut });
	const whole = $derived(Number.isInteger(value));
	const shown = $derived(whole ? Math.round(tween.current) : Math.round(tween.current * 100) / 100);
</script>

{currency ? money(shown, currency, whole ? 0 : 2) : shown}
