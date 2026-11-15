<script lang="ts">
	import { bar } from '#lib/bar.svelte.ts';
	import { CATEGORIES } from '#lib/shared/catalog.ts';
	import { menuRows, slug } from '#lib/shared/logic.ts';
	import type { Category } from '#lib/shared/types.ts';

	const STARTER = [
		'gin', 'vodka', 'white-rum', 'tequila', 'bourbon', 'campari', 'sweet-vermouth',
		'dry-vermouth', 'orange-liqueur', 'soda', 'tonic', 'ginger-beer', 'lime', 'lemon',
		'simple', 'angostura', 'mint', 'olives'
	];

	let search = $state('');
	let name = $state('');
	let category = $state<Category>('spirit');

	const stock = $derived(new Set(bar.core.stock));
	const groups = $derived(
		CATEGORIES.map((c) => ({
			...c,
			items: bar.ingredients.filter(
				(i) => i.category === c.id && i.name.toLowerCase().includes(search.trim().toLowerCase())
			)
		})).filter((g) => g.items.length)
	);
	const offMenu = $derived(
		bar.active ? menuRows(bar.core, bar.active).filter((row) => !row.available) : []
	);

	function toggle(id: string) {
		bar.dispatch({ type: 'stock.set', ids: [id], inStock: !stock.has(id) });
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		const ok = await bar.dispatch({ type: 'ingredient.add', id: slug(name), name, category });
		if (ok) name = '';
	}
</script>

<div class="page-head">
	<div>
		<h1>Inventory</h1>
		<p class="muted">
			{bar.core.stock.length} in stock · {bar.suggestions.ready.length} drinks ready to pour. Tap an
			ingredient when it arrives or runs out.
		</p>
	</div>
	{#if bar.core.stock.length === 0}
		<button
			class="btn primary"
			onclick={() => bar.dispatch({ type: 'stock.set', ids: STARTER, inStock: true })}
		>
			Stock a starter bar
		</button>
	{/if}
</div>

{#if offMenu.length}
	<div class="card warn" role="status">
		<p class="badge out">Off the menu at {bar.active?.name}</p>
		<ul>
			{#each offMenu as row (row.recipe.id)}
				<li>
					{row.recipe.name}
					<span class="muted">needs {row.missing.map((id) => bar.names.get(id) ?? id).join(', ')}</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<label class="search">
	Find an ingredient
	<input type="search" bind:value={search} placeholder="Gin, lime, bitters" />
</label>

{#each groups as group (group.id)}
	<section>
		<div class="section-head">
			<h2>{group.label}</h2>
			<span class="muted">
				{group.items.filter((i) => stock.has(i.id)).length} of {group.items.length}
			</span>
		</div>
		<div class="chips">
			{#each group.items as item (item.id)}
				<span class="chip" class:on={stock.has(item.id)}>
					<button aria-pressed={stock.has(item.id)} onclick={() => toggle(item.id)}>
						{item.name}
					</button>
					{#if item.custom}
						<button
							class="remove"
							aria-label={`Remove ${item.name} from the list`}
							onclick={() => bar.dispatch({ type: 'ingredient.remove', id: item.id })}>×</button
						>
					{/if}
				</span>
			{/each}
		</div>
	</section>
{:else}
	<p class="empty">Nothing matches "{search}". Add it below.</p>
{/each}

<section>
	<div class="section-head"><h2>Add an ingredient</h2></div>
	<form class="add" onsubmit={add}>
		<label>
			Name
			<input bind:value={name} required maxlength="60" placeholder="Yuzu juice" />
		</label>
		<label>
			Shelf
			<select bind:value={category}>
				{#each CATEGORIES as c (c.id)}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
		</label>
		<button class="btn">Add to stock</button>
	</form>
</section>

<style>
	.warn {
		border-color: var(--out);
		margin-bottom: 24px;
	}
	.warn ul {
		margin: 0;
		padding-left: 18px;
	}
	.search {
		max-width: 420px;
		margin-bottom: 32px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: inline-flex;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	.chip.on {
		border-color: var(--gilt);
		background: var(--gilt);
		color: var(--ink);
	}
	.chip button {
		font: inherit;
		font-size: 16px;
		color: inherit;
		background: none;
		border: 0;
		padding: 10px 14px 8px;
		min-height: 44px;
		cursor: pointer;
	}
	.chip:not(.on) button:first-child::before {
		content: '+ ';
		opacity: 0.6;
	}
	.chip .remove {
		padding-inline: 10px;
		border-left: 1px solid currentColor;
		opacity: 0.7;
	}
	.add {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		align-items: end;
		max-width: 720px;
	}
</style>
