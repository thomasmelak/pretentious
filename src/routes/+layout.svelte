<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import Toasts from '#lib/components/Toasts.svelte';
	import { calm } from '#lib/motion.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Cross-fade between screens where the browser supports it.
	onNavigate((navigation) => {
		if (!document.startViewTransition || !calm(1)) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}
<Toasts />
