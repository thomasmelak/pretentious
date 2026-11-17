<!--
	A printed menu for an event: the bird and wordmark, the event, and its drinks grouped by
	spirit with their notes, what goes in them and their prices. On screen it is a preview
	with a few choices above it; printing leaves only the page.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { bar } from '#lib/bar.svelte.ts';
	import Dropdown from '#lib/components/Dropdown.svelte';
	import Peacock from '#lib/components/Peacock.svelte';
	import { eventDate, money } from '#lib/format.ts';
	import { FAMILIES, NO_FAMILY } from '#lib/shared/catalog.ts';
	import { publicMenu } from '#lib/shared/logic.ts';

	const event = $derived(bar.core.events.find((e) => e.id === page.params.id));

	type Paper = 'ivory' | 'olive';
	const PAPERS: { value: Paper; label: string; hint: string }[] = [
		{ value: 'ivory', label: 'Ivory', hint: 'Light paper, olive ink. Kind to the printer' },
		{ value: 'olive', label: 'Olive', hint: 'The brand in full. Turn on background graphics' }
	];
	type Cols = 'auto' | '1' | '2';
	const COLS: { value: Cols; label: string; hint?: string }[] = [
		{ value: 'auto', label: 'Columns: fit', hint: 'Two once the menu runs long' },
		{ value: '1', label: 'One column' },
		{ value: '2', label: 'Two columns' }
	];

	let paper = $state<Paper>('ivory');
	let cols = $state<Cols>('auto');
	let showPrices = $state(true);
	let showIngredients = $state(true);
	let includeOut = $state(false);

	const menu = $derived(event ? publicMenu(bar.core, event, includeOut) : null);
	const items = $derived(menu?.items ?? []);
	const openBar = $derived(Boolean(event?.openBar));
	const prices = $derived(showPrices && !openBar);
	const twoCols = $derived(cols === '2' || (cols === 'auto' && items.length > 10));

	const GROUPS = [...FAMILIES, { id: 'none', label: NO_FAMILY }];
	const groups = $derived(
		GROUPS.map((g) => ({ ...g, items: items.filter((i) => (i.spirit ?? 'none') === g.id) })).filter(
			(g) => g.items.length
		)
	);

	/** "Gin, Campari, sweet vermouth": what goes in, lowercased after the first. */
	function contents(item: (typeof items)[number]) {
		const names = item.ingredients.filter((i) => !i.optional).map((i) => i.name);
		return names.map((n, i) => (i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1))).join(', ');
	}
</script>

<svelte:head>
	<title>{event ? `${event.name} · Printed menu` : 'Printed menu'}</title>
</svelte:head>

{#if event}
	<div class="tools">
		<div>
			<p class="eyebrow"><a href="#/bar/events/{event.id}">{event.name}</a> / Print</p>
			<h1>Print the menu</h1>
			<p class="muted">
				{items.length}
				{items.length === 1 ? 'drink' : 'drinks'}{includeOut ? '' : ' that can be poured now'}.
				{#if openBar}Open bar, so no prices.{/if}
			</p>
		</div>
		<div class="choices">
			<Dropdown label="Paper" options={PAPERS} bind:value={paper} />
			<Dropdown label="Layout" options={COLS} bind:value={cols} />
			<label class="check"><input type="checkbox" bind:checked={showPrices} disabled={openBar} /> Prices</label>
			<label class="check"><input type="checkbox" bind:checked={showIngredients} /> What goes in</label>
			<label class="check"><input type="checkbox" bind:checked={includeOut} /> Drinks we are out of</label>
			<button class="btn primary" onclick={() => window.print()} disabled={!items.length}>Print</button>
		</div>
	</div>

	<article class="sheet {paper}" class:two={twoCols} aria-label="Printed menu preview">
		<header class="mast">
			<div class="bird"><Peacock /></div>
			{#if event.date}<p class="when">{eventDate(event.date)}</p>{/if}
			<h2 class="event">{event.name}</h2>
			{#if openBar}<p class="open">Open bar. Tonight the drinks are on the house.</p>{/if}
		</header>

		{#if items.length}
			<div class="groups">
				{#each groups as group (group.id)}
					<section class="group">
						<h3 class="group-head"><span>{group.label}</span></h3>
						{#each group.items as item (item.id)}
							<div class="drink">
								<p class="line">
									<span class="name">{item.name}</span>
									{#if prices}
										<span class="dots" aria-hidden="true"></span>
										<span class="price">{money(item.price, bar.core.currency)}</span>
									{/if}
								</p>
								{#if item.note}<p class="note">{item.note}</p>{/if}
								{#if showIngredients}<p class="contents">{contents(item)}</p>{/if}
							</div>
						{/each}
					</section>
				{/each}
			</div>
		{:else}
			<p class="empty">Nothing on this menu can be poured right now.</p>
		{/if}

		<footer class="foot">The Pretentious Peacock · Ask the bar about anything off the menu</footer>
	</article>
{:else}
	<p class="empty">That event no longer exists. <a href="#/bar/events">Back to events</a></p>
{/if}

<style>
	.tools {
		display: grid;
		gap: 16px;
		margin-bottom: 24px;
	}
	.tools a {
		text-decoration: none;
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 12px 18px;
	}
	.choices :global(.dropdown) {
		width: 210px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 15px;
		text-transform: none;
		letter-spacing: 0;
		white-space: nowrap;
		color: var(--vellum);
	}
	.check input {
		flex: none;
		width: 20px;
		height: 20px;
		min-height: 0;
		margin: 0;
		padding: 0;
		accent-color: var(--gilt);
	}
	.check:has(input:disabled) {
		color: var(--muted);
	}

	/* The page. Sized like A4 on screen; on paper it fills whatever the printer has. */
	.sheet {
		--ink: #2c331c;
		--soft: #5b6243;
		--accent: #7a5c30;
		--ground: #f6f0e3;
		--rule: #cfc4a8;
		--pp-ground: var(--ground);
		width: min(210mm, 100%);
		min-height: 297mm;
		margin: 0 auto;
		padding: 18mm 16mm 14mm;
		display: flex;
		flex-direction: column;
		color: var(--ink);
		background: var(--ground);
		box-shadow: 0 24px 60px rgb(0 0 0 / 0.45);
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
		/* A menu that runs onto a second page gets the same margins there. */
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}
	.sheet.olive {
		--ink: #f2eadb;
		--soft: #c9c2ae;
		--accent: #e2b988;
		--ground: #2c331c;
		--rule: #4c5634;
		outline: 1px solid var(--line);
	}
	/* The bird is drawn in gilt; on ivory it takes the deeper gilt so it holds on paper. */
	.ivory .bird :global(svg [fill='#E2B988']) {
		fill: #7a5c30;
	}
	.ivory .bird :global(svg [stroke='#E2B988']) {
		stroke: #7a5c30;
	}
	.mast {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 4px;
		padding-bottom: 8mm;
		margin-bottom: 8mm;
		border-bottom: 1px solid var(--rule);
	}
	.bird {
		width: 52mm;
	}
	.bird :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	.when {
		margin: 4mm 0 0;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--soft);
	}
	.event {
		margin: 0;
		font-family: var(--f-display);
		font-weight: 400;
		font-size: 30px;
		line-height: 1.15;
		color: var(--accent);
		overflow-wrap: break-word;
	}
	.open {
		margin: 2mm 0 0;
		font-family: var(--f-serif);
		font-style: italic;
		font-size: 17px;
		color: var(--soft);
	}

	.groups {
		flex: 1;
	}
	.two .groups {
		column-count: 2;
		column-gap: 12mm;
	}
	.group {
		margin-bottom: 7mm;
	}
	.group-head {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 3mm;
		font-family: var(--f-sans);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--accent);
		break-after: avoid;
	}
	.group-head::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--rule);
	}
	.drink {
		margin-bottom: 4mm;
		break-inside: avoid;
	}
	.line {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 0;
	}
	.name {
		font-family: var(--f-display);
		font-size: 21px;
		line-height: 1.2;
		color: var(--ink);
		overflow-wrap: break-word;
		min-width: 0;
	}
	.dots {
		flex: 1;
		min-width: 12px;
		border-bottom: 1px dotted var(--rule);
		transform: translateY(-4px);
	}
	.price {
		font-size: 15px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--accent);
		white-space: nowrap;
	}
	.note {
		margin: 1mm 0 0;
		font-family: var(--f-serif);
		font-style: italic;
		font-size: 15px;
		line-height: 1.3;
		color: var(--soft);
	}
	.contents {
		margin: 1mm 0 0;
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--soft);
	}
	.foot {
		margin-top: 6mm;
		padding-top: 4mm;
		border-top: 1px solid var(--rule);
		text-align: center;
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--soft);
	}
	.sheet .empty {
		color: var(--soft);
		text-align: center;
	}

	@media (max-width: 640px) {
		.sheet {
			min-height: 0;
			padding: 24px 18px;
		}
		.two .groups {
			column-count: 1;
		}
		.choices :global(.dropdown) {
			width: 100%;
		}
	}

	@page {
		margin: 0;
	}
	@media print {
		/* Only the page goes to the printer: no bar header, footer, banners or toasts. */
		/* The paper colour runs to the edge of every page, the last one included. */
		:global(html:has(.sheet)),
		:global(body:has(.sheet)) {
			background: #f6f0e3;
		}
		:global(html:has(.sheet.olive)),
		:global(body:has(.sheet.olive)) {
			background: #2c331c;
		}
		:global(header.top),
		:global(footer.wrap.foot),
		:global(.toasts),
		:global(.alert),
		.tools {
			display: none !important;
		}
		:global(main.wrap.body) {
			max-width: none;
			margin: 0;
			padding: 0;
		}
		/* The bird prints settled, never mid-flourish. */
		.sheet :global(*) {
			animation: none !important;
		}
		.sheet {
			width: 100%;
			min-height: 100vh;
			box-shadow: none;
			outline: none;
		}
	}
</style>
