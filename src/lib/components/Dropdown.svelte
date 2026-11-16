<!--
	The app's dropdown. A button that opens a list of choices, each with an optional icon,
	hint and group heading. The list opens under the button, or over it when there is more
	room above, follows the page as it scrolls, and on a phone rises from the bottom as a
	sheet. Long lists get a filter. Works with the keyboard like a native select: arrows,
	Home/End, Enter or Space to pick, Escape to close, and typing letters jumps to a choice.
-->
<script lang="ts" generics="T extends string">
	import { tick, type Snippet } from 'svelte';

	interface Option {
		value: T;
		label: string;
		hint?: string;
		/** Choices that share a group are listed under its heading. */
		group?: string;
		disabled?: boolean;
	}

	interface Props {
		options: readonly Option[];
		value: T;
		/** Shown above the button, and its accessible name. */
		label: string;
		/** Draws an icon for a choice. */
		icon?: Snippet<[T]>;
		onchange?: (value: T) => void;
		/** Keeps the label for screen readers only, where something in view already names it. */
		compact?: boolean;
		/** `field` for forms; `mini` for a unit beside an input. */
		size?: 'field' | 'mini';
		/** Show a filter box: always, never, or for lists longer than eight. */
		search?: boolean | 'auto';
		placeholder?: string;
		disabled?: boolean;
	}

	let {
		options,
		value = $bindable(),
		label,
		icon,
		onchange,
		compact = false,
		size = 'field',
		search = 'auto',
		placeholder = 'Choose',
		disabled = false
	}: Props = $props();

	const uid = $props.id();
	let root: HTMLDivElement | undefined = $state();
	let button: HTMLButtonElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();
	let filter: HTMLInputElement | undefined = $state();

	let open = $state(false);
	let up = $state(false);
	let sheet = $state(false);
	let active = $state(-1);
	let term = $state('');
	let place = $state('');

	const current = $derived(options.find((o) => o.value === value));
	const filterable = $derived(search === 'auto' ? options.length > 8 : search);
	const shown = $derived.by(() => {
		const t = term.trim().toLowerCase();
		return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
	});

	function groupStarts(i: number) {
		return !term && !!shown[i].group && shown[i].group !== shown[i - 1]?.group;
	}

	/** The label split around what was typed in the filter, to light up the match. */
	function parts(text: string) {
		const t = term.trim();
		const at = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
		return at < 0 ? null : [text.slice(0, at), text.slice(at, at + t.length), text.slice(at + t.length)];
	}

	function step(from: number, dir: 1 | -1) {
		let n = from;
		for (let k = 0; k < shown.length; k++) {
			n = (n + dir + shown.length) % shown.length;
			if (!shown[n].disabled) return n;
		}
		return from;
	}

	function setActive(n: number, scroll = true) {
		active = n;
		if (scroll) tick().then(() => list?.querySelector(`#${CSS.escape(`${uid}-o${n}`)}`)?.scrollIntoView({ block: 'nearest' }));
	}

	/** Under the button, or over it when there is more room above. A sheet on a phone. */
	function position() {
		if (!button || !panel) return;
		sheet = matchMedia('(max-width: 639px)').matches;
		if (sheet) {
			place = '';
			return;
		}
		const r = button.getBoundingClientRect();
		const below = innerHeight - r.bottom;
		up = below < 280 && r.top > below;
		const width = Math.max(r.width, panel.offsetWidth);
		const left = Math.min(r.left, Math.max(8, innerWidth - width - 8));
		place = [
			`left:${left}px`,
			`min-width:${r.width}px`,
			up ? `bottom:${innerHeight - r.top + 6}px` : `top:${r.bottom + 6}px`,
			`max-height:${Math.min(360, Math.max(160, (up ? r.top : below) - 16))}px`
		].join(';');
	}

	async function show() {
		if (disabled || open) return;
		term = '';
		open = true;
		await tick();
		panel?.showPopover?.();
		position();
		const at = shown.findIndex((o) => o.value === value);
		setActive(at >= 0 && !shown[at].disabled ? at : step(-1, 1));
		// On a phone the list takes focus, not the filter, so the keyboard only opens when tapped.
		(sheet ? list : (filter ?? list))?.focus({ preventScroll: true });
	}

	function hide(refocus = true) {
		if (!open) return;
		if (panel?.matches(':popover-open')) panel.hidePopover();
		open = false;
		if (refocus) button?.focus({ preventScroll: true });
	}

	function pick(n: number) {
		const option = shown[n];
		if (!option || option.disabled) return;
		hide();
		if (option.value === value) return;
		value = option.value;
		onchange?.(option.value);
	}

	let typed = '';
	let typedAt = 0;
	function keys(e: KeyboardEvent) {
		const k = e.key;
		if (k === 'ArrowDown' || k === 'ArrowUp') setActive(step(active, k === 'ArrowDown' ? 1 : -1));
		else if (k === 'Home' && !filterable) setActive(step(-1, 1));
		else if (k === 'End' && !filterable) setActive(step(shown.length, -1));
		else if (k === 'Enter' || (k === ' ' && !filterable)) pick(active);
		else if (k === 'Escape') hide();
		else if (k === 'Tab') return hide(false);
		else if (!filterable && k.length === 1 && k !== ' ') {
			// Typing jumps to the first choice that starts with the letters typed.
			const now = Date.now();
			typed = (now - typedAt > 600 ? '' : typed) + k.toLowerCase();
			typedAt = now;
			const hit = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed));
			if (hit >= 0) setActive(hit);
			return;
		} else return;
		e.preventDefault();
	}

	function triggerKeys(e: KeyboardEvent) {
		if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
			e.preventDefault();
			show();
		}
	}

	// While open: follow the button as the page scrolls, and close on a click elsewhere.
	$effect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			const target = e.target as Node;
			if (target === panel || !root?.contains(target)) hide(false);
		};
		addEventListener('scroll', position, true);
		addEventListener('resize', position);
		document.addEventListener('pointerdown', away);
		return () => {
			removeEventListener('scroll', position, true);
			removeEventListener('resize', position);
			document.removeEventListener('pointerdown', away);
		};
	});

	function focusout(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && root?.contains(next)) return;
		hide(false);
	}
</script>

<div class="dropdown" class:compact data-size={size} bind:this={root} onfocusout={focusout}>
	<span class="label" id="{uid}-label">{label}</span>
	<button
		type="button"
		class="trigger"
		bind:this={button}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{uid}-list"
		aria-labelledby="{uid}-label {uid}-value"
		onclick={() => (open ? hide() : show())}
		onkeydown={triggerKeys}
	>
		{#if icon && current}<span class="lead">{@render icon(current.value)}</span>{/if}
		<span class="value" class:empty={!current} id="{uid}-value">{current?.label ?? placeholder}</span>
		<svg class="caret" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div bind:this={panel} popover="manual" class="panel" class:sheet class:up={!sheet && up} style={place}>
			{#if sheet}<p class="sheet-title">{label}</p>{/if}
			{#if filterable}
				<div class="filter">
					<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
						<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5" />
						<path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
					<input
						bind:this={filter}
						bind:value={term}
						placeholder="Type to filter"
						aria-label="Filter choices"
						aria-controls="{uid}-list"
						aria-activedescendant={active >= 0 ? `${uid}-o${active}` : undefined}
						autocomplete="off"
						onkeydown={keys}
						oninput={() => setActive(step(-1, 1))}
					/>
					{#if term}<span class="found">{shown.length} found</span>{/if}
				</div>
			{/if}
			<ul
				bind:this={list}
				id="{uid}-list"
				role="listbox"
				tabindex="-1"
				class="list"
				aria-labelledby="{uid}-label"
				aria-activedescendant={!filterable && active >= 0 ? `${uid}-o${active}` : undefined}
				onkeydown={keys}
			>
				{#each shown as option, i (option.value)}
					{#if groupStarts(i)}<li class="group" role="presentation">{option.group}</li>{/if}
					<!-- Keys are handled by the list, which keeps focus while a choice is active. -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="{uid}-o{i}"
						role="option"
						class="option"
						class:active={i === active}
						style="--i:{Math.min(i, 12)}"
						aria-selected={option.value === value}
						aria-disabled={option.disabled || undefined}
						onpointermove={() => !option.disabled && active !== i && setActive(i, false)}
						onclick={() => pick(i)}
					>
						{#if icon}<span class="lead">{@render icon(option.value)}</span>{/if}
						<span class="text">
							<span>
								{#if parts(option.label)}
									{@const [before, match, after] = parts(option.label)!}
									{before}<mark>{match}</mark>{after}
								{:else}
									{option.label}
								{/if}
							</span>
							{#if option.hint}<small>{option.hint}</small>{/if}
						</span>
						<svg class="tick" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
							<path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</li>
				{:else}
					<li class="none">No match. Try fewer letters.</li>
				{/each}
			</ul>
		</div>
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
	.compact .label,
	[data-size='mini'] .label {
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
		padding: 8px 10px 8px 12px;
		font: inherit;
		font-size: 17px;
		text-align: left;
		color: var(--vellum);
		background: var(--olive-deep);
		border: 1px solid var(--line);
		cursor: pointer;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}
	[data-size='mini'] .trigger {
		gap: 6px;
		padding-inline: 10px 8px;
	}
	.trigger:hover {
		border-color: var(--gilt-deep);
	}
	.trigger[aria-expanded='true'],
	.trigger:focus-visible {
		border-color: var(--gilt);
		outline: none;
	}
	.trigger:focus-visible {
		box-shadow: 0 0 0 3px rgb(226 185 136 / 0.3);
	}
	.trigger:disabled {
		color: var(--muted);
		cursor: not-allowed;
		border-color: var(--line);
	}
	.value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.value.empty {
		color: var(--muted);
	}
	.lead {
		display: inline-flex;
		flex: none;
	}
	.caret {
		flex: none;
		color: var(--muted);
		transition:
			rotate 220ms cubic-bezier(0.3, 0.7, 0.2, 1.2),
			color 150ms ease;
	}
	[aria-expanded='true'] .caret,
	.trigger:hover .caret {
		color: var(--gilt);
	}
	[aria-expanded='true'] .caret {
		rotate: 180deg;
	}

	.panel {
		position: fixed;
		inset: auto;
		margin: 0;
		display: flex;
		flex-direction: column;
		max-width: min(26rem, calc(100vw - 1rem));
		overflow: hidden;
		padding: 4px;
		color: var(--vellum);
		background: var(--olive-deep);
		border: 1px solid var(--gilt-deep);
		box-shadow:
			0 24px 48px -16px rgb(0 0 0 / 0.6),
			0 2px 6px -2px rgb(0 0 0 / 0.2);
		transform-origin: top center;
		animation: panel-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.panel.up {
		transform-origin: bottom center;
		--from: 6px;
	}
	.panel.sheet {
		inset: auto 0 0 0;
		width: auto;
		max-width: none;
		max-height: 70dvh;
		padding: 6px 10px calc(12px + env(safe-area-inset-bottom, 0px));
		border-width: 1px 0 0;
		animation-name: sheet-in;
		animation-duration: 260ms;
	}
	.panel.sheet::backdrop {
		background: rgb(0 0 0 / 0.55);
	}
	.sheet-title {
		margin: 0;
		padding: 0 0 10px;
		text-align: center;
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--gilt);
	}
	.sheet-title::before {
		display: block;
		width: 40px;
		height: 4px;
		margin: 4px auto 12px;
		border-radius: 999px;
		background: var(--line);
		content: '';
	}

	.filter {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: -4px -4px 4px;
		padding: 6px 12px;
		color: var(--muted);
		border-bottom: 1px solid var(--line);
	}
	/* On a phone the filter sits at the bottom of the sheet, by the thumb and the keyboard. */
	.sheet .filter {
		order: 1;
		margin: 4px -10px 0;
		padding-top: 10px;
		border-top: 1px solid var(--line);
		border-bottom: 0;
	}
	.filter input {
		flex: 1;
		min-width: 0;
		min-height: 36px;
		padding: 4px;
		font-size: 15px;
		color: var(--vellum);
		background: transparent;
		border: 0;
		box-shadow: none;
	}
	.filter input:focus {
		outline: none;
	}
	.found {
		font-size: 12px;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.list {
		flex: 1;
		min-height: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		outline: none;
	}
	.group {
		padding: 10px 10px 4px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px 7px;
		cursor: pointer;
		font-size: 16px;
		transition:
			background-color 120ms ease,
			color 120ms ease;
		animation: option-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
		animation-delay: calc(var(--i) * 14ms);
	}
	.sheet .option {
		padding: 12px;
		font-size: 17px;
	}
	.option.active {
		background: rgb(226 185 136 / 0.14);
	}
	.option[aria-selected='true'] {
		color: var(--gilt);
	}
	.option[aria-disabled='true'] {
		color: var(--muted);
		cursor: not-allowed;
	}
	.text {
		flex: 1;
		display: grid;
		min-width: 0;
	}
	small {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.35;
	}
	mark {
		color: var(--gilt);
		font-weight: 600;
		background: transparent;
	}
	.tick {
		flex: none;
		color: var(--gilt);
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity 150ms ease,
			transform 200ms cubic-bezier(0.3, 0.7, 0.2, 1.4);
	}
	[aria-selected='true'] .tick {
		opacity: 1;
		transform: none;
	}
	.none {
		padding: 12px 10px;
		font-size: 14px;
		color: var(--muted);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(var(--from, -6px)) scale(0.97);
		}
	}
	@keyframes sheet-in {
		from {
			transform: translateY(100%);
		}
	}
	@keyframes option-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.panel,
		.option,
		.caret,
		.tick {
			animation: none;
			transition: none;
		}
	}
</style>
