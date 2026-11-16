<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import PriceEdit from '#lib/components/PriceEdit.svelte';
	import { money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { drinkCost, menuBudget, menuRows, missing, pourCost } from '#lib/shared/logic.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const event = $derived(bar.core.events.find((e) => e.id === page.params.id));
	const rows = $derived(event ? menuRows(bar.core, event) : []);
	const live = $derived(event?.id === bar.core.activeEventId);
	const cur = $derived(bar.core.currency);
	const plan = $derived(event?.expect ?? 100);
	const budget = $derived(event ? menuBudget(bar.core, event, plan) : null);
	const margin = $derived(budget ? budget.takings - budget.buySpend : 0);

	/** Pour cost bands, as the trade reads them: under a quarter is healthy, over a third is dear. */
	const band = (share: number | null) => (share === null ? '' : share <= 0.25 ? 'good' : share <= 0.33 ? 'fair' : 'dear');
	const pct = (share: number) => `${Math.round(share * 100)}%`;

	function needText(n: number, unit: 'ml' | 'each') {
		if (unit === 'each') return `${Math.ceil(n)}`;
		return n >= 1000 ? `${Math.round(n / 100) / 10} l` : `${Math.round(n)} ml`;
	}

	const candidates = $derived.by(() => {
		if (!event) return [];
		const on = new Set(event.items.map((i) => i.recipeId));
		const stock = new Set(bar.core.stock);
		return bar.recipes
			.filter((r) => !on.has(r.id))
			.map((recipe) => ({ recipe, missing: missing(recipe, stock) }))
			.sort((a, b) => a.missing.length - b.missing.length);
	});
	const makeable = $derived(candidates.filter((c) => c.missing.length === 0));

	const names = (ids: string[]) => ids.map((id) => bar.names.get(id) ?? id).join(', ');

	function rename(e: SubmitEvent) {
		e.preventDefault();
		if (!event) return;
		const data = new FormData(e.currentTarget as HTMLFormElement);
		bar.dispatch({
			type: 'event.update',
			id: event.id,
			name: String(data.get('name')),
			date: String(data.get('date'))
		});
		toasts.push('Details saved.', 'ok');
	}

	function addAll() {
		if (!event) return;
		const items = makeable.map((c) => ({ recipeId: c.recipe.id, price: c.recipe.price }));
		bar.dispatch({ type: 'menu.add', eventId: event.id, items });
		toasts.push(`${items.length} drinks added. The menu looks rather well.`, 'ok');
	}
</script>

{#if event}
	<div class="page-head">
		<div>
			<p class="eyebrow"><a href="#/bar/events">Events</a> / Menu</p>
			<h1>{event.name}</h1>
			<p class="muted">
				<b class="figure"><Count value={rows.length} /></b> on the menu ·
				<b class="figure"><Count value={rows.filter((r) => r.available).length} /></b> available now.
				Drinks missing an ingredient stay here but are hidden from guests until it is back.
			</p>
		</div>
		{#if live}
			<span class="badge pick">Live</span>
		{:else}
			<button
				class="btn"
				onclick={() => {
					bar.dispatch({ type: 'event.activate', id: event.id });
					toasts.push(`${event.name} is live. Guests now see its menu.`, 'ok');
				}}
			>
				Go live
			</button>
		{/if}
	</div>

	<form class="card details" onsubmit={rename}>
		<label>Event name <input name="name" value={event.name} required maxlength="80" /></label>
		<label>Date <input name="date" type="date" value={event.date} /></label>
		<button class="btn">Save details</button>
	</form>

	<label class="card open-bar" class:on={event.openBar}>
		<input
			type="checkbox"
			checked={Boolean(event.openBar)}
			onchange={(e) => {
				const open = e.currentTarget.checked;
				bar.dispatch({ type: 'event.openBar', id: event.id, open });
				toasts.push(open ? 'Open bar. Prices are hidden from guests and the till.' : 'Prices are back.', 'ok');
			}}
		/>
		<span>
			<b>Open bar</b>
			<span class="muted">
				No prices on the guest menu or the till, and orders go straight to the bar without payment.
				The prices below are kept for next time.
			</span>
		</span>
	</label>

	<section>
		<div class="section-head"><h2>On the menu</h2></div>
		{#if rows.length}
			<ul class="list">
				{#each rows as row (row.recipe.id)}
					{@const c = drinkCost(bar.core, row.recipe)}
					<li
						class:off={!row.available}
						animate:flip={{ duration: calm(300) }}
						in:slide={{ duration: calm(300) }}
						out:fade={{ duration: calm(150) }}
					>
						<GlassIcon glass={row.recipe.glass} color={row.recipe.color} />
						<div class="what">
							<h3>{row.recipe.name}</h3>
							{#if row.available}
								<span class="badge ok">Available</span>
							{:else}
								<span class="badge out">Hidden · needs {names(row.missing)}</span>
							{/if}
							{#if c.cost > 0}
								{@const share = event.openBar ? null : pourCost(c.cost, row.price)}
								<span class="pour {band(share)}" title={c.unpriced.length ? `Not counting ${c.unpriced.join(', ')}` : undefined}>
									Costs {money(c.cost, cur, 2)}{c.unpriced.length ? '+' : ''}{share !== null ? ` · ${pct(share)} of the price` : ''}
								</span>
							{/if}
						</div>
						<PriceEdit
							value={row.price}
							currency={bar.core.currency}
							name={row.recipe.name}
							group="event-menu"
							onsave={(price) =>
								bar.dispatch({ type: 'menu.price', eventId: event.id, recipeId: row.recipe.id, price })}
							onremove={() =>
								bar.dispatch({ type: 'menu.remove', eventId: event.id, recipeId: row.recipe.id })}
						/>
						<!-- Out of the tab order, so Tab runs down the prices. Shift+Delete while editing a price removes it. -->
						<button
							class="btn small quiet"
							tabindex="-1"
							aria-label={`Remove ${row.recipe.name} from the menu`}
							onclick={() =>
								bar.dispatch({ type: 'menu.remove', eventId: event.id, recipeId: row.recipe.id })}
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">This menu is empty. Add drinks from the list below.</p>
		{/if}
	</section>

	{#if budget && rows.length}
		<section class="budget">
			<div class="section-head spread">
				<h2>Budget</h2>
				<label class="plan">
					Planning for
					<input
						type="number"
						min="1"
						step="10"
						value={plan}
						aria-label="Drinks you expect to pour"
						onchange={(e) => bar.dispatch({ type: 'event.expect', id: event.id, drinks: Number(e.currentTarget.value) })}
					/>
					drinks
				</label>
			</div>
			<p class="muted">
				Spread evenly over the {rows.length} drinks on the menu.
				{#if budget.priced < rows.length}
					<b class="partial">{budget.priced} of {rows.length} are fully priced</b>, so these sums are low until the rest are.
				{/if}
			</p>
			<div class="stats">
				<div class="stat">
					<span class="eyebrow">A drink costs</span>
					<b class="figure">{money(budget.avgCost, cur, 2)}</b>
					<span class="muted">
						on average{#if !event.openBar && budget.avgPrice > 0}, <span class="pour {band(pourCost(budget.avgCost, budget.avgPrice))}">{pct(budget.avgCost / budget.avgPrice)} of the price</span>{/if}
					</span>
				</div>
				<div class="stat">
					<span class="eyebrow">To buy</span>
					<b class="figure">{money(budget.buySpend, cur)}</b>
					<span class="muted">whole bottles · {money(budget.pourSpend, cur)} is poured</span>
				</div>
				{#if event.openBar}
					<div class="stat">
						<span class="eyebrow">Open bar</span>
						<b class="figure">{money(budget.buySpend / budget.drinks, cur, 2)}</b>
						<span class="muted">a drink, with nothing taken</span>
					</div>
				{:else}
					<div class="stat">
						<span class="eyebrow">Takings</span>
						<b class="figure">{money(Math.round(budget.takings), cur)}</b>
						<span class="muted">at menu prices</span>
					</div>
					<div class="stat">
						<span class="eyebrow">Left after stock</span>
						<b class="figure" class:neg={margin < 0}>{money(Math.round(margin), cur)}</b>
						<span class="muted">takings less bottles</span>
					</div>
				{/if}
			</div>
			{#if budget.unpriced.length}
				<p class="unpriced">
					No price yet for {budget.unpriced.length > 6
						? `${budget.unpriced.slice(0, 5).join(', ')} and ${budget.unpriced.length - 5} more`
						: names(budget.unpriced)}, so the sums leave them out.
					<a href="#/bar/inventory">Price them in Inventory</a>.
				</p>
			{/if}
			<details class="shopping">
				<summary>Shopping list · {budget.shopping.length} ingredients</summary>
				<table>
					<thead>
						<tr><th>Ingredient</th><th>Needed</th><th>Buy</th><th>Spend</th></tr>
					</thead>
					<tbody>
						{#each budget.shopping as p (p.id + p.unit)}
							<tr class:none={p.spend === null}>
								<td>{p.name}</td>
								<td>{needText(p.need, p.unit)}{p.id === 'ice' ? ' cubes' : ''}</td>
								<td>
									{#if p.packs !== null && p.size !== null}
										{p.packs} × {p.unit === 'each' ? (p.size === 1 ? 'each' : `${p.size}`) : needText(p.size, 'ml')}
									{:else}
										<span class="muted">no price</span>
									{/if}
								</td>
								<td>{p.spend !== null ? money(p.spend, cur) : '–'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</details>
		</section>
	{/if}

	<section>
		<div class="section-head spread">
			<h2>Add drinks</h2>
			{#if makeable.length}
				<button class="btn small" onclick={addAll}>
					Add all {makeable.length} I can make
				</button>
			{/if}
		</div>
		<ul class="list">
			{#each candidates as c (c.recipe.id)}
				<li
					class:off={c.missing.length > 0}
					animate:flip={{ duration: calm(300) }}
					in:slide={{ duration: calm(300) }}
					out:fade={{ duration: calm(150) }}
				>
					<GlassIcon glass={c.recipe.glass} color={c.recipe.color} />
					<div class="what">
						<h3>{c.recipe.name}</h3>
						{#if c.missing.length === 0}
							<span class="badge ok">Ready to pour</span>
						{:else}
							<span class="badge out">Needs {names(c.missing)}</span>
						{/if}
					</div>
					<span class="price">{money(c.recipe.price, bar.core.currency)}</span>
					<button
						class="btn small"
						aria-label={`Add ${c.recipe.name} to the menu`}
						onclick={() =>
							bar.dispatch({
								type: 'menu.add',
								eventId: event.id,
								items: [{ recipeId: c.recipe.id, price: c.recipe.price }]
							})}
					>
						Add
					</button>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="empty" style="margin-top:32px">
		That event no longer exists. <a href="#/bar/events">Back to events</a>
	</p>
{/if}

<style>
	.open-bar {
		flex-direction: row;
		align-items: flex-start;
		gap: 14px;
		margin: 12px 0 28px;
		cursor: pointer;
		text-transform: none;
		letter-spacing: normal;
		font-weight: 400;
		font-size: 16px;
		color: var(--vellum);
	}
	.open-bar input {
		width: 22px;
		min-height: 22px;
		height: 22px;
		margin-top: 2px;
		accent-color: var(--gilt);
		flex: none;
	}
	.open-bar > span {
		display: grid;
		gap: 4px;
	}
	.open-bar b {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--gilt);
	}
	.open-bar.on {
		border-color: var(--gilt);
		background: rgb(226 185 136 / 0.08);
	}
	.details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		align-items: end;
		gap: 12px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 12px 16px;
		padding: 12px 8px;
		margin-inline: -8px;
		border-bottom: 1px solid var(--line);
		transition: background 200ms;
	}
	.list li:hover {
		background: rgb(226 185 136 / 0.05);
	}
	.off :global(.glass) {
		opacity: 0.45;
	}
	.figure {
		color: var(--gilt);
		font-weight: 600;
	}
	.what {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.what .badge {
		white-space: normal;
	}
	.off h3 {
		color: var(--muted);
	}
	.page-head a {
		text-decoration: none;
	}
	.pour {
		font-size: 13px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.pour.good {
		color: var(--available);
	}
	.pour.fair {
		color: var(--gilt);
	}
	.pour.dear {
		color: var(--out);
	}
	.what .pour {
		display: block;
		margin-top: 2px;
	}
	.plan {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
		color: var(--muted);
		letter-spacing: 0;
		text-transform: none;
	}
	.plan input {
		width: 6em;
		min-height: 38px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		margin-top: 14px;
	}
	.stat {
		display: grid;
		gap: 4px;
		padding: 14px 16px;
		border: 1px solid var(--line);
		background: rgb(0 0 0 / 0.12);
	}
	.stat b {
		font-size: 28px;
		font-weight: 400;
		color: var(--gilt);
		font-variant-numeric: tabular-nums;
	}
	.stat b.neg {
		color: var(--out);
	}
	.stat .muted {
		font-size: 14px;
	}
	.partial {
		color: var(--gilt);
		font-weight: 500;
	}
	.unpriced {
		margin-top: 12px;
		font-size: 14px;
		color: var(--muted);
	}
	.shopping {
		margin-top: 14px;
	}
	.shopping summary {
		cursor: pointer;
		font-size: 13px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--gilt);
	}
	.shopping table {
		width: 100%;
		margin-top: 10px;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	.shopping th {
		text-align: left;
		font-size: 12px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
		padding: 6px 8px;
		border-bottom: 1px solid var(--line);
	}
	.shopping td {
		padding: 8px;
		border-bottom: 1px solid var(--line);
	}
	.shopping th:not(:first-child),
	.shopping td:not(:first-child) {
		text-align: right;
	}
	.shopping tr.none td {
		color: var(--muted);
	}
	@media (max-width: 520px) {
		.list li {
			grid-template-columns: auto minmax(0, 1fr) auto;
		}
		.what {
			grid-column: 2 / -1;
		}
		.list li > :nth-child(3) {
			grid-column: 2;
		}
	}
</style>
