<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import { money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { menuRows, missing } from '#lib/shared/logic.ts';
	import { toasts } from '#lib/toast.svelte.ts';

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
		toasts.push('Details saved.', 'ok');
	}

	function addAll() {
		if (!event) return;
		const items = makeable.map((c) => ({ recipeId: c.recipe.id, price: c.recipe.price }));
		bar.dispatch({ type: 'menu.add', eventId: event.id, items });
		toasts.push(`${items.length} drinks added. The menu looks rather well.`, 'ok');
	}

	/** Tab and Enter move down the prices; Shift+Enter moves up; Shift+Delete takes a drink off. */
	function priceKeys(e: KeyboardEvent & { currentTarget: HTMLInputElement }, recipeId: string) {
		const all = [...document.querySelectorAll<HTMLInputElement>('input.price-input')];
		const at = all.indexOf(e.currentTarget);
		if (e.key === 'Enter') {
			e.preventDefault();
			all[at + (e.shiftKey ? -1 : 1)]?.focus();
		} else if (e.key === 'Delete' && e.shiftKey && event) {
			e.preventDefault();
			const next = all[at + 1] ?? all[at - 1];
			bar.dispatch({ type: 'menu.remove', eventId: event.id, recipeId });
			requestAnimationFrame(() => next?.focus());
		}
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
						</div>
						<label class="price-field">
							Price
							<input
								type="number"
								min="0"
								step="0.5"
								value={row.price}
								class="price-input"
								aria-label={`Price of ${row.recipe.name}`}
								aria-keyshortcuts="Enter Shift+Delete"
								onfocus={(e) => e.currentTarget.select()}
								onkeydown={(e) => priceKeys(e, row.recipe.id)}
								onchange={(e) =>
									bar.dispatch({
										type: 'menu.price',
										eventId: event.id,
										recipeId: row.recipe.id,
										price: Number(e.currentTarget.value)
									})}
							/>
						</label>
						<!-- Out of the tab order, so Tab runs down the prices. Shift+Delete in a price removes it. -->
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
	.price-field {
		width: 104px;
	}
	.page-head a {
		text-decoration: none;
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
