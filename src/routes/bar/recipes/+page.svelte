<script lang="ts">
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import ProfileIcon from '#lib/components/ProfileIcon.svelte';
	import RecipeWizard from '#lib/components/RecipeWizard.svelte';
	import { money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { PROFILES } from '#lib/shared/catalog.ts';
	import { profileOf, type Suggestion } from '#lib/shared/logic.ts';
	import { countable, measures } from '#lib/shared/measure.ts';
	import type { Recipe } from '#lib/shared/types.ts';
	import { hasWork, startEdit, startNew, wizard } from '#lib/stores/wizard.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const onMenu = $derived(new Set(bar.active?.items.map((i) => i.recipeId)));
	const stock = $derived(new Set(bar.core.stock));

	let search = $state('');
	const matches = (list: Suggestion[]) => {
		const q = search.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(s) =>
				s.recipe.name.toLowerCase().includes(q) ||
				s.recipe.style.toLowerCase().includes(q) ||
				s.recipe.ingredients.some((i) => (bar.names.get(i.id) ?? '').toLowerCase().includes(q))
		);
	};
	const ready = $derived(matches(bar.suggestions.ready));
	const oneAway = $derived(matches(bar.suggestions.oneAway));
	const rest = $derived(matches(bar.suggestions.rest));

	let formEl = $state<HTMLElement>();
	const profileLabel = (r: Recipe) => PROFILES.find((p) => p.id === profileOf(r))!;

	function reveal() {
		requestAnimationFrame(() =>
			formEl?.scrollIntoView({ block: 'start', behavior: calm(1) ? 'smooth' : 'auto' })
		);
	}

	/** Open the wizard on a recipe, without silently throwing away a draft in progress. */
	function edit(recipe: Recipe) {
		if ($wizard.open && $wizard.editing === recipe.id) return reveal();
		if (hasWork() && !confirm(`Put aside the recipe you were writing and edit ${recipe.name}?`)) return;
		startEdit(recipe);
		reveal();
	}

	function create() {
		if (!$wizard.open) startNew();
		reveal();
	}

	function toggleMenu(recipe: Recipe) {
		if (!bar.active) return;
		if (onMenu.has(recipe.id)) {
			bar.dispatch({ type: 'menu.remove', eventId: bar.active.id, recipeId: recipe.id });
			toasts.push(`${recipe.name} taken off the menu for ${bar.active.name}.`);
		} else {
			bar.dispatch({
				type: 'menu.add',
				eventId: bar.active.id,
				items: [{ recipeId: recipe.id, price: recipe.price }]
			});
			toasts.push(`${recipe.name} is on the menu for ${bar.active.name}.`, 'ok');
		}
	}

	function remove(recipe: Recipe) {
		const restoring = recipe.edited;
		const question = restoring
			? `Undo your changes to the ${recipe.name} and pour it the classic way again?`
			: `Delete ${recipe.name}? It will leave every menu it is on.`;
		if (!confirm(question)) return;
		bar.dispatch({ type: 'recipe.remove', id: recipe.id });
		toasts.push(restoring ? `The classic ${recipe.name} is back.` : `${recipe.name} deleted.`);
	}
</script>

{#snippet card(s: Suggestion)}
	<article class="card" class:dim={s.missing.length > 0}>
		<div class="spread">
			<p class="eyebrow">{s.recipe.style}{s.recipe.glass ? ` · ${s.recipe.glass}` : ''}</p>
			{#if s.recipe.custom}
				<span class="badge pick house-tag">House</span>
			{:else if s.recipe.edited}
				<span class="badge pick house-tag">Your version</span>
			{/if}
		</div>
		<div class="title">
			<GlassIcon glass={s.recipe.glass} size={36} color={s.recipe.color} />
			<h3>{s.recipe.name}</h3>
			<span class="price">{money(s.recipe.price, bar.core.currency)}</span>
		</div>
		<p class="profile"><ProfileIcon profile={profileOf(s.recipe)} size={18} /> {profileLabel(s.recipe).label}</p>
		{#if s.recipe.note}<p class="note">{s.recipe.note}</p>{/if}
		<ul class="ings">
			{#each s.recipe.ingredients as i (i.id)}
				{@const [first, second] = measures(i.amount, countable(i.amount, bar.shelves.get(i.id)))}
				<li class:missing={!i.optional && !stock.has(i.id)} class:opt={i.optional}>
					<span class="amt">{first}{#if second}<small>{second}</small>{/if}</span>
					<span>{bar.names.get(i.id) ?? i.id}{i.optional ? ' (optional)' : ''}</span>
				</li>
			{/each}
		</ul>
		{#if s.missing.length}
			<p class="badge out">
				Needs {s.missing.map((id) => bar.names.get(id) ?? id).join(', ')}
			</p>
		{/if}
		{#if s.recipe.method}
			<details>
				<summary>Method</summary>
				<p class="muted">
					{s.recipe.method}{s.recipe.garnish ? ` Garnish: ${s.recipe.garnish}.` : ''}
				</p>
			</details>
		{/if}
		<div class="row actions">
			{#if bar.active}
				<button
					class="btn small"
					class:primary={!onMenu.has(s.recipe.id)}
					aria-pressed={onMenu.has(s.recipe.id)}
					onclick={() => toggleMenu(s.recipe)}
				>
					{onMenu.has(s.recipe.id) ? 'On the menu ✓' : 'Add to menu'}
				</button>
			{/if}
			<button class="btn small quiet" onclick={() => edit(s.recipe)}>Edit</button>
			{#if s.recipe.custom}
				<button class="btn small quiet" onclick={() => remove(s.recipe)}>Delete</button>
			{:else if s.recipe.edited}
				<button class="btn small quiet" onclick={() => remove(s.recipe)}>Restore classic</button>
			{/if}
		</div>
	</article>
{/snippet}

{#snippet shelf(list: Suggestion[])}
	<div class="grid">
		{#each list as s (s.recipe.id)}
			<div
				class="cell"
				animate:flip={{ duration: calm(400) }}
				in:scale={{ start: 0.94, duration: calm(300) }}
			>
				{@render card(s)}
			</div>
		{/each}
	</div>
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
	{#if !$wizard.open}
		<button class="btn primary" onclick={create}>Create a house recipe</button>
	{/if}
</div>

<div bind:this={formEl} class="form-anchor">
	{#if $wizard.open}
		<RecipeWizard />
	{/if}
</div>

<label class="search">
	Find a drink
	<input type="search" bind:value={search} placeholder="Name, style or ingredient" />
</label>

<section>
	<div class="section-head">
		<h2>Ready to pour</h2>
		<span class="badge ok"><Count value={ready.length} /></span>
	</div>
	{#if ready.length}
		{@render shelf(ready)}
	{:else if search.trim()}
		<p class="empty">Nothing ready to pour matches "{search}".</p>
	{:else}
		<p class="empty">
			Nothing yet. <a href="#/bar/inventory">Tell us what is on the shelf</a> and the recipes will
			follow.
		</p>
	{/if}
</section>

{#if oneAway.length}
	<section>
		<div class="section-head">
			<h2>One ingredient away</h2>
			<span class="muted">{oneAway.length}</span>
		</div>
		{@render shelf(oneAway)}
	</section>
{/if}

{#if rest.length}
	<section>
		<details open={search.trim() !== ''}>
			<summary class="section-head">
				<h2>Out of reach</h2>
				<span class="muted">{rest.length}</span>
			</summary>
			{@render shelf(rest)}
		</details>
	</section>
{/if}

<style>
	.form-anchor {
		scroll-margin-top: 80px;
	}
	.search {
		max-width: 420px;
		margin-bottom: 32px;
	}
	.cell {
		display: grid;
		min-width: 0;
	}
	.card:hover {
		border-color: var(--gilt);
		transform: translateY(-3px);
	}
	.card :global(.glass) {
		transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.card:hover :global(.glass) {
		transform: rotate(-10deg);
	}
	.title {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
	}
	.house-tag::before {
		animation: none;
	}
	.ings {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 16px;
	}
	.ings li {
		display: grid;
		grid-template-columns: 5.2em minmax(0, 1fr);
		gap: 8px;
		padding: 2px 0;
	}
	.ings .amt {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.ings small {
		display: block;
		font-size: 12px;
		opacity: 0.8;
	}
	.profile {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		color: var(--gilt);
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
	summary.section-head {
		list-style: revert;
		display: list-item;
	}
	summary.section-head h2,
	summary.section-head span {
		display: inline;
		margin-right: 10px;
	}
	@media (prefers-reduced-motion: reduce) {
		.card:hover {
			transform: none;
		}
	}
</style>
