<script lang="ts">
	import { bar } from '#lib/bar.svelte.ts';
	import { money } from '#lib/format.ts';
	import { slug, type Suggestion } from '#lib/shared/logic.ts';

	const onMenu = $derived(new Set(bar.active?.items.map((i) => i.recipeId)));
	const stock = $derived(new Set(bar.core.stock));

	function toggleMenu(recipeId: string, price: number) {
		if (!bar.active) return;
		if (onMenu.has(recipeId)) {
			bar.dispatch({ type: 'menu.remove', eventId: bar.active.id, recipeId });
		} else {
			bar.dispatch({ type: 'menu.add', eventId: bar.active.id, items: [{ recipeId, price }] });
		}
	}

	// House recipe form
	let open = $state(false);
	let name = $state('');
	let style = $state('');
	let glass = $state('');
	let note = $state('');
	let method = $state('');
	let price = $state(12);
	let rows = $state([{ id: '', amount: '', optional: false }]);

	async function addRecipe(event: SubmitEvent) {
		event.preventDefault();
		const ok = await bar.dispatch({
			type: 'recipe.add',
			recipe: {
				id: slug(name),
				name,
				style: style || 'House recipe',
				glass,
				note,
				method,
				price,
				ingredients: rows.filter((r) => r.id)
			}
		});
		if (ok) {
			name = style = glass = note = method = '';
			price = 12;
			rows = [{ id: '', amount: '', optional: false }];
			open = false;
		}
	}
</script>

{#snippet card(s: Suggestion)}
	<article class="card" class:dim={s.missing.length > 0}>
		<p class="eyebrow">{s.recipe.style}{s.recipe.glass ? ` · ${s.recipe.glass}` : ''}</p>
		<div class="spread">
			<h3>{s.recipe.name}</h3>
			<span class="price">{money(s.recipe.price, bar.core.currency)}</span>
		</div>
		{#if s.recipe.note}<p class="note">{s.recipe.note}</p>{/if}
		<ul class="ings">
			{#each s.recipe.ingredients as i (i.id)}
				<li class:missing={!i.optional && !stock.has(i.id)} class:opt={i.optional}>
					<span>{i.amount}</span>
					{bar.names.get(i.id) ?? i.id}{i.optional ? ' (optional)' : ''}
				</li>
			{/each}
		</ul>
		{#if s.missing.length}
			<p class="badge out">
				Needs {s.missing.map((id) => bar.names.get(id) ?? id).join(', ')}
			</p>
		{/if}
		<details>
			<summary>Method</summary>
			<p class="muted">
				{s.recipe.method}{s.recipe.garnish ? ` Garnish: ${s.recipe.garnish}.` : ''}
			</p>
		</details>
		<div class="row actions">
			{#if bar.active}
				<button
					class="btn small"
					class:primary={!onMenu.has(s.recipe.id)}
					aria-pressed={onMenu.has(s.recipe.id)}
					onclick={() => toggleMenu(s.recipe.id, s.recipe.price)}
				>
					{onMenu.has(s.recipe.id) ? 'On the menu ✓' : 'Add to menu'}
				</button>
			{/if}
			{#if s.recipe.custom}
				<button
					class="btn small quiet"
					onclick={() =>
						confirm(`Delete ${s.recipe.name}?`) &&
						bar.dispatch({ type: 'recipe.remove', id: s.recipe.id })}
				>
					Delete
				</button>
			{/if}
		</div>
	</article>
{/snippet}

<div class="page-head">
	<div>
		<h1>Recipes</h1>
		<p class="muted">
			What your inventory can make right now.
			{#if bar.active}
				Adding a drink puts it on the menu for <b>{bar.active.name}</b>.
			{:else}
				<a href="#/bar/events">Create an event</a> to start building a menu.
			{/if}
		</p>
	</div>
	<button class="btn" onclick={() => (open = !open)} aria-expanded={open}>
		{open ? 'Close' : 'Add a house recipe'}
	</button>
</div>

{#if open}
	<form class="card house" onsubmit={addRecipe}>
		<h2>House recipe</h2>
		<div class="fields">
			<label>Name <input bind:value={name} required maxlength="80" /></label>
			<label>Style <input bind:value={style} placeholder="Shaken · Sour" maxlength="80" /></label>
			<label>Glass <input bind:value={glass} placeholder="Coupe" maxlength="40" /></label>
			<label>
				Price
				<input type="number" min="0" step="0.5" bind:value={price} required />
			</label>
		</div>
		<label>
			Tasting note, shown to guests
			<input bind:value={note} maxlength="200" />
		</label>
		<fieldset>
			<legend class="eyebrow">Ingredients</legend>
			{#each rows as row, n (n)}
				<div class="ing-row">
					<select bind:value={row.id} aria-label="Ingredient" required={n === 0}>
						<option value="">Choose</option>
						{#each bar.ingredients as i (i.id)}
							<option value={i.id}>{i.name}</option>
						{/each}
					</select>
					<input bind:value={row.amount} placeholder="2 oz" aria-label="Amount" maxlength="30" />
					<label class="check">
						<input type="checkbox" bind:checked={row.optional} /> Optional
					</label>
				</div>
			{/each}
			<button
				type="button"
				class="btn small quiet"
				onclick={() => rows.push({ id: '', amount: '', optional: false })}
			>
				Another ingredient
			</button>
		</fieldset>
		<label>Method <textarea bind:value={method} rows="2" maxlength="600"></textarea></label>
		<div><button class="btn primary">Save recipe</button></div>
	</form>
{/if}

<section>
	<div class="section-head">
		<h2>Ready to pour</h2>
		<span class="badge ok">{bar.suggestions.ready.length}</span>
	</div>
	{#if bar.suggestions.ready.length}
		<div class="grid">
			{#each bar.suggestions.ready as s (s.recipe.id)}{@render card(s)}{/each}
		</div>
	{:else}
		<p class="empty">
			Nothing yet. <a href="#/bar/inventory">Tell us what is on the shelf</a> and the recipes will
			follow.
		</p>
	{/if}
</section>

{#if bar.suggestions.oneAway.length}
	<section>
		<div class="section-head">
			<h2>One ingredient away</h2>
			<span class="muted">{bar.suggestions.oneAway.length}</span>
		</div>
		<div class="grid">
			{#each bar.suggestions.oneAway as s (s.recipe.id)}{@render card(s)}{/each}
		</div>
	</section>
{/if}

{#if bar.suggestions.rest.length}
	<section>
		<details>
			<summary class="section-head">
				<h2>Out of reach</h2>
				<span class="muted">{bar.suggestions.rest.length}</span>
			</summary>
			<div class="grid">
				{#each bar.suggestions.rest as s (s.recipe.id)}{@render card(s)}{/each}
			</div>
		</details>
	</section>
{/if}

<style>
	.ings {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 16px;
	}
	.ings span {
		display: inline-block;
		min-width: 4.6em;
		color: var(--muted);
	}
	.ings .missing {
		color: var(--out);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}
	.ings .opt {
		color: var(--muted);
	}
	.actions {
		margin-top: auto;
		padding-top: 6px;
	}
	.house {
		gap: 16px;
		margin-bottom: 32px;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
		justify-items: start;
	}
	.ing-row {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
		gap: 8px;
		width: 100%;
		align-items: center;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.check input {
		width: 20px;
		min-height: 20px;
		height: 20px;
		accent-color: var(--gilt);
	}
	summary.section-head {
		list-style: revert;
		display: list-item;
	}
	summary.section-head h2,
	summary.section-head span {
		display: inline;
		margin-right: 10px;
	}
</style>
