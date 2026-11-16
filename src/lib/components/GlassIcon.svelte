<!-- A glass outline, optionally filled with the drink's colour. -->
<script lang="ts">
	interface Props {
		glass?: string;
		size?: number;
		/** Liquid colour. Leave out for an empty glass. */
		color?: string;
		/** Rising bubbles, for long drinks. */
		fizz?: boolean;
	}

	let { glass = '', size = 32, color, fizz = false }: Props = $props();

	const kind = $derived.by(() => {
		const g = glass.toLowerCase();
		for (const k of ['martini', 'rocks', 'highball', 'flute', 'wine', 'mug', 'hurricane']) {
			if (g.includes(k)) return k;
		}
		return 'coupe';
	});

	// The liquid inside each glass, drawn under the outline.
	const LIQUID: Record<string, string> = {
		coupe: 'M6.2 9.5h19.6c-.9 4.6-5 7.8-9.8 7.8S7.1 14.1 6.2 9.5z',
		martini: 'M7.6 8.5h16.8L16 17.6z',
		rocks: 'M7.45 13.5h17.1L23.4 25.5H8.6z',
		highball: 'M10.75 10h10.5l-.75 18h-9z',
		flute: 'M12.75 9h6.5c-.3 5.5-1.2 8.6-3.25 10.2C13.95 17.6 13 14.5 12.75 9z',
		wine: 'M10.35 9.5h11.3c-.4 4.3-2.6 7-5.65 7s-5.25-2.7-5.65-7z',
		mug: 'M7.5 12h13.5v11a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2z',
		hurricane:
			'M12.2 9h7.6c-.6 1.6-1.3 3-1.3 5 0 3 2.5 4.2 2.5 7.2-1.4.8-3.2 1.2-5 1.2s-3.6-.4-5-1.2c0-3 2.5-4.2 2.5-7.2 0-2-.7-3.4-1.3-5z'
	};
</script>

<svg
	class="glass"
	class:fizzy={fizz && color}
	viewBox="0 0 32 32"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.3"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if color}
		<path class="liquid" d={LIQUID[kind]} fill={color} stroke="none" />
		{#if fizz}
			<g class="bubbles" stroke="var(--vellum)" stroke-width="0.7">
				<circle cx="14.5" cy="22" r="0.8" />
				<circle cx="17.5" cy="19" r="0.6" />
				<circle cx="15.5" cy="16" r="0.5" />
			</g>
		{/if}
	{/if}
	{#if kind === 'rocks'}
		<path d="M7 9h18l-1.6 16.5H8.6z" />
		<path d="M13 16.5l5.2-.8.8 5.2-5.2.8z" opacity="0.8" />
	{:else if kind === 'martini'}
		<path d="M5 6h22L16 18z" />
		<path d="M16 18v9M11 27h10" />
	{:else if kind === 'highball'}
		<path d="M10.5 4h11l-1 24h-9z" />
	{:else if kind === 'flute'}
		<path d="M12.5 4h7c0 9.5-1 13.2-3.5 15.2C13.5 17.2 12.5 13.5 12.5 4z" />
		<path d="M16 19.2V27M11.5 27h9" />
	{:else if kind === 'wine'}
		<path d="M10.5 4h11c1 7.5-1.5 12.5-5.5 12.5S9.5 11.5 10.5 4z" />
		<path d="M16 16.5V27M11 27h10" />
	{:else if kind === 'mug'}
		<path d="M7.5 8h13.5v15a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2z" />
		<path d="M21 11.5h2a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5h-2" />
	{:else if kind === 'hurricane'}
		<path
			d="M11 4h10c0 5-2.5 6.5-2.5 10 0 3 2.5 4.2 2.5 7.2-1.4.8-3.2 1.2-5 1.2s-3.6-.4-5-1.2c0-3 2.5-4.2 2.5-7.2 0-3.5-2.5-5-2.5-10z"
		/>
		<path d="M16 22.4V27M11.5 27h9" />
	{:else}
		<path d="M5 8h22c0 6-4.9 10.5-11 10.5S5 14 5 8z" />
		<path d="M16 18.5V27M10.5 27h11" />
	{/if}
</svg>

<style>
	.glass {
		display: block;
		flex: none;
		color: var(--gilt);
		overflow: visible;
	}
	.liquid {
		opacity: 0.9;
		transition: fill 500ms;
	}
	.bubbles circle {
		animation: rise 2.6s ease-in infinite;
		opacity: 0;
	}
	.bubbles circle:nth-child(2) {
		animation-delay: 0.9s;
	}
	.bubbles circle:nth-child(3) {
		animation-delay: 1.7s;
	}
	@keyframes rise {
		0% {
			opacity: 0;
			transform: translateY(0);
		}
		20% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: translateY(-7px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bubbles circle {
			animation: none;
			opacity: 0.8;
		}
	}
</style>
