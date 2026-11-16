<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import { calm } from '#lib/motion.ts';
	import { toasts } from '#lib/toast.svelte.ts';
</script>

<div class="toasts" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<button
			type="button"
			class="toast {toast.tone}"
			animate:flip={{ duration: calm(250) }}
			in:fly={{ y: 24, duration: calm(350) }}
			out:fade={{ duration: calm(200) }}
			onclick={() => toasts.dismiss(toast.id)}
		>
			{toast.text}
		</button>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--tray, 0px) + 16px + env(safe-area-inset-bottom, 0px));
		z-index: 30;
		display: grid;
		justify-items: center;
		gap: 8px;
		padding-inline: 16px;
		pointer-events: none;
		transition: bottom 300ms ease;
	}
	.toast {
		pointer-events: auto;
		font: inherit;
		font-size: 16px;
		text-align: center;
		max-width: 480px;
		color: var(--ink);
		background: var(--vellum);
		border: 0;
		border-left: 4px solid var(--gilt-deep);
		padding: 12px 18px 10px;
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
		cursor: pointer;
	}
	.toast.ok {
		border-left-color: #5d7a2e;
	}
	.toast.out {
		border-left-color: var(--pimento);
	}
</style>
