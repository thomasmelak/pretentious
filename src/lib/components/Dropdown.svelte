<!--
	A styled single-choice dropdown: a button that opens a list of options, each with an
	optional icon and hint. Works with the keyboard like a native select: arrows, Home/End,
	Enter or Space to pick, Escape to close, and typing a letter jumps to it.
-->
<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { calm } from '#lib/motion.ts';

	interface Option {
		value: T;
		label: string;
		hint?: string;
	}

	interface Props {
		options: Option[];
		value: T;
		/** Shown above the button, and its accessible name. */
		label: string;
		/** Draws an icon for an option. */
		icon?: Snippet<[T]>;
		onchange?: (value: T) => void;
		compact?: boolean;
	}

	let { options, value = $bindable(), label, icon, onchange, compact = false }: Props = $props();

	const uid = `dd${Math.random().toString(36).slice(2, 8)}`;
	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();
	let button: HTMLButtonElement | undefined = $state();

	const current = $derived(options.find((o) => o.value === value));

	function show() {
		active = Math.max(0, options.findIndex((o) => o.value === value));
		open = true;
		requestAnimationFrame(() => {
			list?.focus();
			list?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
		});
	}

	function pick(i: number) {
		const option = options[i];
		if (!option) return;
		value = option.value;
		onchange?.(option.value);
		open = false;
		button?.focus();
	}

	function move(to: number) {
		active = Math.min(options.length - 1, Math.max(0, to));
		list?.querySelector(`#${uid}-${active}`)?.scrollIntoView({ block: 'nearest' });
	}

	function onListKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') move(active + 1);
		else if (e.key === 'ArrowUp') move(active - 1);
		else if (e.key === 'Home') move(0);
		else if (e.key === 'End') move(options.length - 1);
		else if (e.key === 'Enter' || e.key === ' ') pick(active);
		else if (e.key === 'Escape' || e.key === 'Tab') {
			open = false;
			if (e.key === 'Escape') button?.focus();
			return;
		} else if (e.key.length === 1 && /\S/.test(e.key)) {
			const k = e.key.toLowerCase();
			const after = [...options.slice(active + 1), ...options.slice(0, active + 1)];
			const hit = after.find((o) => o.label.toLowerCase().startsWith(k));
			if (hit) move(options.indexOf(hit));
		} else return;
		e.preventDefault();
	}

	function onButtonKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			show();
		}
	}
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}}
/>

<div class="dropdown" class:compact bind:this={root}>
	<span class="label" id="{uid}-label">{label}</span>
	<button
		type="button"
		class="trigger"
		class:open
		bind:this={button}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-labelledby="{uid}-label {uid}-value"
		onclick={() => (open ? (open = false) : show())}
		onkeydown={onButtonKey}
	>
		{#if icon && current}{@render icon(current.value)}{/if}
		<span class="value" id="{uid}-value">{current?.label ?? 'Choose'}</span>
		<svg class="caret" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
			<path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" />
		</svg>
	</button>
	{#if open}
		<ul
			class="menu"
			role="listbox"
			tabindex="-1"
			bind:this={list}
			aria-labelledby="{uid}-label"
			aria-activedescendant="{uid}-{active}"
			onkeydown={onListKey}
			transition:fly={{ y: -6, duration: calm(160) }}
		>
			{#each options as option, i (option.value)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="{uid}-{i}"
					role="option"
					aria-selected={option.value === value}
					class:active={i === active}
					onpointermove={() => (active = i)}
					onclick={() => pick(i)}
				>
					{#if icon}{@render icon(option.value)}{/if}
					<span class="text">
						{option.label}
						{#if option.hint}<small>{option.hint}</small>{/if}
					</span>
					{#if option.value === value}<span class="tick" aria-hidden="true">✓</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: grid;
		gap: 6px;
		min-width: 0;
	}
	.label {
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--muted);
	}
	.compact .label {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.trigger {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 44px;
		padding: 8px 12px;
		font: inherit;
		font-size: 17px;
		text-align: left;
		color: var(--vellum);
		background: var(--olive-deep);
		border: 1px solid var(--line);
		cursor: pointer;
		transition: border-color 160ms;
	}
	.trigger:hover,
	.trigger.open {
		border-color: var(--gilt);
	}
	.value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.caret {
		color: var(--gilt);
		transition: transform 200ms;
	}
	.open .caret {
		transform: rotate(180deg);
	}
	.menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 20;
		min-width: 220px;
		max-height: 320px;
		overflow-y: auto;
		margin: 6px 0 0;
		padding: 6px;
		list-style: none;
		background: var(--olive-deep);
		border: 1px solid var(--gilt);
		box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
	}
	.menu:focus {
		outline: none;
	}
	li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px 7px;
		cursor: pointer;
		color: var(--vellum);
	}
	li.active {
		background: rgb(226 185 136 / 0.14);
	}
	li[aria-selected='true'] {
		color: var(--gilt);
	}
	.text {
		flex: 1;
		display: grid;
	}
	small {
		color: var(--muted);
		font-size: 13px;
	}
	.tick {
		color: var(--gilt);
	}
</style>
