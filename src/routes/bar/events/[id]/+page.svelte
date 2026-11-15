<script lang="ts">
	import { page } from '$app/state';
	import { bar } from '#lib/bar.svelte.ts';
	import { money } from '#lib/format.ts';
	import { menuRows, missing } from '#lib/shared/logic.ts';

	const event = $derived(bar.core.events.find((e) => e.id === page.params.id));
	const rows = $derived(event ? menuRows(bar.core, event) : []);
	const live = $derived(event?.id === bar.core.activeEventId);

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
	}
</script>

{#if event}
	<div class="page-head">
		<div>
			<p class="eyebrow"><a href="#/bar/events">Events</a> / Menu</p>
			<h1>{event.name}</h1>
			<p class="muted">
				{rows.length} on the menu · {rows.filter((r) => r.available).length} available now.
				Drinks missing an ingredient stay here but are hidden from guests until it is back.
			</p>
		</div>
		{#if live}
			<span class="badge pick">Live</span>
		{:else}
			<button class="btn" onclick={() => bar.dispatch({ type: 'event.activate', id: event.id })}>
				Go live
			</button>
		{/if}
	</div>

	<form class="card details" onsubmit={rename}>
		<label>Event name <input name="name" value={event.name} required maxlength="80" /></label>
		<label>Date <input name="date" type="date" value={event.date} /></label>
		<button class="btn">Save details</button>
	</form>

	<section>
		<div class="section-head"><h2>On the menu</h2></div>
		{#if rows.length}
			<ul class="list">
				{#each rows as row (row.recipe.id)}
					<li class:off={!row.available}>
						<div class="what">
							<h3>{row.recipe.name}</h3>
							{#if row.available}
								<span class="badge ok">Available</span>
							{:else}
								<span class="badge out">Hidden · needs {names(row.missing)}</span>
							{/if}
						</div>
						<label class="price-field">
							Price
							<input
								type="number"
								min="0"
								step="0.5"
								value={row.price}
								aria-label={`Price of ${row.recipe.name}`}
								onchange={(e) =>
									bar.dispatch({
										type: 'menu.price',
										eventId: event.id,
										recipeId: row.recipe.id,
										price: Number(e.currentTarget.value)
									})}
							/>
						</label>
						<button
							class="btn small quiet"
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

	<section>
		<div class="section-head spread">
			<h2>Add drinks</h2>
			{#if makeable.length}
				<button
					class="btn small"
					onclick={() =>
						bar.dispatch({
							type: 'menu.add',
							eventId: event.id,
							items: makeable.map((c) => ({ recipeId: c.recipe.id, price: c.recipe.price }))
						})}
				>
					Add all {makeable.length} I can make
				</button>
			{/if}
		</div>
		<ul class="list">
			{#each candidates as c (c.recipe.id)}
				<li class:off={c.missing.length > 0}>
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
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 12px 16px;
		padding: 12px 0;
		border-bottom: 1px solid var(--line);
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
	.price-field {
		width: 104px;
	}
	.page-head a {
		text-decoration: none;
	}
	@media (max-width: 520px) {
		.list li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.what {
			grid-column: 1 / -1;
		}
	}
</style>
