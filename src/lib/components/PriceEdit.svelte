<!--
	A price that edits in place. Click it (or focus it and start typing) and it turns into
	a field: Enter or clicking away saves, Escape cancels, and Tab saves and opens the next
	price in the same group (Shift+Tab the one before), so a whole menu can be priced
	without touching the mouse.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { money } from '#lib/format.ts';

	interface Props {
		value: number;
		currency: string;
		/** What is being priced, for screen readers: "Negroni". */
		name: string;
		/** Prices in one group are walked with Tab and Shift+Tab. */
		group?: string;
		onsave: (price: number) => void | Promise<unknown>;
		/** Shift+Delete while editing, when the row can be removed. */
		onremove?: () => void;
		compact?: boolean;
	}

	let { value, currency, name, group = 'prices', onsave, onremove, compact = false }: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let refused = $state(false);
	let saved = $state(false);
	let input: HTMLInputElement | undefined = $state();
	let button: HTMLButtonElement | undefined = $state();
	let field: HTMLSpanElement | undefined = $state();

	async function start(initial?: string) {
		draft = initial ?? String(value);
		editing = true;
		await tick();
		input?.focus();
		if (initial === undefined) input?.select();
	}

	/** "$12.50", "12,5" and "12" all read as prices. */
	function parse(text: string): number | null {
		const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
		if (!cleaned) return null;
		const n = Math.round(Number(cleaned) * 100) / 100;
		return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
	}

	/** Save the draft. False if it was not a price, so the field stays open. */
	function commit(): boolean {
		const n = parse(draft);
		if (n === null) {
			refused = false;
			requestAnimationFrame(() => (refused = true));
			return false;
		}
		editing = false;
		if (n !== value) {
			onsave(n);
			saved = false;
			requestAnimationFrame(() => (saved = true));
		}
		return true;
	}

	function cancel() {
		editing = false;
		tick().then(() => button?.focus());
	}

	/** Open the price before or after this one; with none there, land back on this one. */
	async function openNeighbour(step: 1 | -1) {
		// Find the neighbour while this price is still a field, so it has a place in the list.
		const all = [...document.querySelectorAll<HTMLElement>(`[data-price-group="${group}"]`)];
		const here = field ? all.indexOf(field) : -1;
		const next = here === -1 ? undefined : all[here + step];
		if (!commit()) return;
		await tick();
		if (next instanceof HTMLButtonElement && next.isConnected) next.click();
		else button?.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (commit()) tick().then(() => button?.focus());
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		} else if (e.key === 'Tab') {
			e.preventDefault();
			openNeighbour(e.shiftKey ? -1 : 1);
		} else if (e.key === 'Delete' && e.shiftKey && onremove) {
			e.preventDefault();
			const all = [...document.querySelectorAll<HTMLElement>(`[data-price-group="${group}"]`)];
			const here = field ? all.indexOf(field) : -1;
			const next = all[here + 1] ?? all[here - 1];
			editing = false;
			onremove();
			tick().then(() => next?.focus());
		}
	}

	function onButtonKey(e: KeyboardEvent) {
		// Start typing a number on a focused price to replace it.
		if (/^[\d.,]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			start(e.key);
		}
	}
</script>

{#if editing}
	<span class="field" class:compact class:refused bind:this={field} data-price-group={group}>
		<input
			bind:this={input}
			bind:value={draft}
			inputmode="decimal"
			autocomplete="off"
			aria-label={`Price of ${name}`}
			aria-keyshortcuts={onremove ? 'Enter Escape Tab Shift+Tab Shift+Delete' : 'Enter Escape Tab Shift+Tab'}
			{onkeydown}
			onblur={() => editing && (commit() || cancel())}
		/>
	</span>
{:else}
	<button
		type="button"
		class="price-edit"
		class:compact
		class:saved
		bind:this={button}
		data-price-group={group}
		aria-label={`Price of ${name}: ${money(value, currency)}. Edit`}
		onclick={(e) => {
			e.stopPropagation();
			start();
		}}
		onkeydown={onButtonKey}
	>
		<span class="amount">{money(value, currency)}</span>
		<svg class="pencil" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
			<path d="M11 2.5l2.5 2.5L5.5 13H3v-2.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
		</svg>
	</button>
{/if}

<style>
	.price-edit {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 6px 10px 4px;
		font: inherit;
		font-size: 18px;
		font-variant-numeric: tabular-nums;
		color: var(--gilt);
		background: transparent;
		border: 1px dashed transparent;
		cursor: text;
		transition:
			border-color 160ms,
			background 160ms;
		white-space: nowrap;
	}
	.price-edit:hover,
	.price-edit:focus-visible {
		border-color: var(--gilt-deep);
		background: rgb(226 185 136 / 0.08);
	}
	.pencil {
		opacity: 0.35;
		transition: opacity 160ms;
	}
	.price-edit:hover .pencil,
	.price-edit:focus-visible .pencil {
		opacity: 1;
	}
	.price-edit.saved .amount {
		animation: saved 700ms ease-out;
	}
	@keyframes saved {
		0% {
			color: var(--available);
			text-shadow: 0 0 12px rgb(157 186 106 / 0.8);
		}
	}
	.compact {
		min-height: 32px;
		padding: 4px 6px 2px;
		font-size: 16px;
	}
	.field input {
		width: 6.5em;
		min-height: 40px;
		padding: 6px 10px 4px;
		font-size: 18px;
		font-variant-numeric: tabular-nums;
		border-color: var(--gilt);
	}
	.field.compact input {
		width: 5.5em;
		min-height: 32px;
		padding: 4px 6px 2px;
		font-size: 16px;
	}
	.refused input {
		border-color: var(--out);
		animation: shake 360ms ease-in-out;
	}
	@media (prefers-reduced-motion: reduce) {
		.price-edit.saved .amount,
		.refused input {
			animation: none;
		}
	}
</style>
