<script lang="ts">
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import { calm } from '#lib/motion.ts';
	import { CATEGORIES, FAMILIES, INGREDIENTS } from '#lib/shared/catalog.ts';
	import { listNames, menuRows, slug } from '#lib/shared/logic.ts';
	import type { Category, Family, Ingredient, Op } from '#lib/shared/types.ts';
	import { useIngredient, wizard } from '#lib/stores/wizard.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const STARTER = [
		'gin', 'vodka', 'white-rum', 'tequila', 'bourbon', 'campari', 'sweet-vermouth',
		'dry-vermouth', 'orange-liqueur', 'soda', 'tonic', 'ginger-beer', 'lime', 'lemon',
		'simple', 'angostura', 'mint', 'olives'
	];

	let search = $state('');
	let name = $state('');
	let category = $state<Category>('spirit');
	let family = $state<Family | ''>('');
	let intoDraft = $state(true);

	const draftName = $derived($wizard.draft.name.trim() || 'your recipe');

	// Editing an ingredient.
	let editMode = $state(false);
	let editing = $state<Ingredient | null>(null);
	const original = (id: string) => INGREDIENTS.find((i) => i.id === id);

	function startEditing(item: Ingredient) {
		editing = { ...item, family: item.family };
	}

	async function saveEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!editing) return;
		const ok = await bar.dispatch({ type: 'ingredient.update', ingredient: editing });
		if (ok) {
			toasts.push(`${editing.name} saved. Every recipe that uses it follows along.`, 'ok');
			editing = null;
		}
	}

	async function removeEditing() {
		if (!editing) return;
		const builtIn = original(editing.id);
		const question = builtIn
			? `Go back to calling it ${builtIn.name}?`
			: `Delete ${editing.name} from the shelf?`;
		if (!confirm(question)) return;
		const ok = await bar.dispatch({ type: 'ingredient.remove', id: editing.id });
		if (ok) {
			toasts.push(builtIn ? `${builtIn.name} is itself again.` : `${editing.name} deleted.`);
			editing = null;
		}
	}

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

	let touched = $state('');

	const pourable = () =>
		new Map(
			(bar.active ? menuRows(bar.core, bar.active) : [])
				.filter((row) => row.available)
				.map((row) => [row.recipe.id, row.recipe.name])
		);
	const within = () => new Map(bar.suggestions.ready.map((s) => [s.recipe.id, s.recipe.name]));

	/** Change the stock, then say what it did to the menu and to what can be made. */
	function restock(op: Op) {
		const menuBefore = pourable();
		const readyBefore = within();
		bar.dispatch(op);
		const menuAfter = pourable();
		const gone = [...menuBefore].filter(([id]) => !menuAfter.has(id)).map(([, n]) => n);
		const back = [...menuAfter].filter(([id]) => !menuBefore.has(id)).map(([, n]) => n);
		if (gone.length) toasts.push(`Off the menu: ${listNames(gone)}.`, 'out', 6000);
		if (back.length) toasts.push(`Back on the menu: ${listNames(back)}.`, 'ok', 6000);
		if (gone.length || back.length) return;
		const unlocked = [...within()].filter(([id]) => !readyBefore.has(id)).map(([, n]) => n);
		if (unlocked.length) {
			const shown = unlocked.slice(0, 3);
			const more = unlocked.length - shown.length;
			toasts.push(`Now within reach: ${listNames(shown)}${more ? ` and ${more} more` : ''}.`, 'ok');
		}
	}

	function toggle(id: string) {
		// Clear first so tapping the same chip twice still plays the pop.
		touched = '';
		requestAnimationFrame(() => (touched = id));
		restock({ type: 'stock.set', ids: [id], inStock: !stock.has(id) });
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		const id = slug(name);
		const ok = await bar.dispatch({
			type: 'ingredient.add',
			id,
			name,
			category,
			family: family || undefined
		});
		if (!ok) return;
		if ($wizard.open && intoDraft) {
			useIngredient(id);
			toasts.push(`${name.trim()} is in stock and in ${draftName}.`, 'ok');
		} else {
			toasts.push(`${name.trim()} is in stock.`, 'ok');
		}
		name = '';
		family = '';
	}
</script>

<div class="page-head">
	<div>
		<h1>Inventory</h1>
		<p class="muted">
			<b class="figure"><Count value={bar.core.stock.length} /></b> in stock ·
			<b class="figure"><Count value={bar.suggestions.ready.length} /></b>
			{bar.suggestions.ready.length === 1 ? 'drink' : 'drinks'} ready to pour. Tap an ingredient when
			it arrives or runs out.
		</p>
	</div>
	<div class="row">
		{#if bar.core.stock.length === 0}
			<button
				class="btn primary"
				onclick={() => restock({ type: 'stock.set', ids: STARTER, inStock: true })}
			>
				Stock a starter bar
			</button>
		{/if}
		<button
			class="btn"
			aria-pressed={editMode}
			class:primary={editMode}
			onclick={() => {
				editMode = !editMode;
				editing = null;
			}}
		>
			{editMode ? 'Done editing' : 'Edit ingredients'}
		</button>
	</div>
</div>

{#if $wizard.open}
	<div class="card draft" transition:slide={{ duration: calm(300) }}>
		<p>
			You are writing <b>{draftName}</b>. Ingredients you add below can go straight into it.
		</p>
		<a class="btn small primary" href="#/bar/recipes">Back to the recipe</a>
	</div>
{/if}

{#if editMode}
	<p class="edit-hint" transition:slide={{ duration: calm(250) }}>
		Tap an ingredient to rename it, move it to another shelf or set its spirit family.
	</p>
{/if}

{#if offMenu.length}
	<div class="card warn" role="status" transition:slide={{ duration: calm(300) }}>
		<p class="badge out">Off the menu at {bar.active?.name}</p>
		<ul>
			{#each offMenu as row (row.recipe.id)}
				<li animate:flip={{ duration: calm(300) }} transition:slide={{ duration: calm(250) }}>
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
				<span
					class="chip"
					class:on={stock.has(item.id)}
					class:touched={touched === item.id}
					class:editable={editMode}
					class:selected={editing?.id === item.id}
				>
					{#if editMode}
						<button
							aria-label={`Edit ${item.name}`}
							aria-expanded={editing?.id === item.id}
							onclick={() => (editing?.id === item.id ? (editing = null) : startEditing(item))}
						>
							<span class="pencil" aria-hidden="true">✎</span>
							{item.name}
						</button>
					{:else}
						<button aria-pressed={stock.has(item.id)} onclick={() => toggle(item.id)}>
							{item.name}
						</button>
					{/if}
				</span>
			{/each}
		</div>
		{#if editing && group.items.some((i) => i.id === editing?.id)}
			<form class="card editor" onsubmit={saveEdit} transition:slide={{ duration: calm(250) }}>
				<p class="eyebrow">
					Editing {original(editing.id)?.name ?? group.items.find((i) => i.id === editing?.id)?.name}
				</p>
				<div class="editor-fields">
					<label>Name <input bind:value={editing.name} required maxlength="60" /></label>
					<label>
						Shelf
						<select bind:value={editing.category}>
							{#each CATEGORIES as c (c.id)}
								<option value={c.id}>{c.label}</option>
							{/each}
						</select>
					</label>
					{#if editing.category === 'spirit'}
						<label>
							Spirit family
							<select bind:value={editing.family}>
								<option value={undefined}>None</option>
								{#each FAMILIES as f (f.id)}
									<option value={f.id}>{f.label}</option>
								{/each}
							</select>
						</label>
					{/if}
				</div>
				<div class="row">
					<button class="btn small primary">Save</button>
					<button type="button" class="btn small quiet" onclick={() => (editing = null)}>Cancel</button>
					{#if !original(editing.id)}
						<button type="button" class="btn small quiet danger" onclick={removeEditing}>Delete</button>
					{:else if group.items.find((i) => i.id === editing?.id)?.edited}
						<button type="button" class="btn small quiet" onclick={removeEditing}>Restore original</button>
					{/if}
				</div>
			</form>
		{/if}
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
		{#if category === 'spirit'}
			<label>
				Spirit family
				<select bind:value={family}>
					<option value="">None</option>
					{#each FAMILIES as f (f.id)}
						<option value={f.id}>{f.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		<button class="btn">Add to stock</button>
		{#if $wizard.open}
			<label class="check into">
				<input type="checkbox" bind:checked={intoDraft} /> Also put it in {draftName}
			</label>
		{/if}
	</form>
</section>

<style>
	.warn {
		border-color: var(--out);
		margin-bottom: 24px;
	}
	.draft {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		border-color: var(--gilt);
		margin-bottom: 24px;
	}
	.edit-hint {
		color: var(--gilt);
		margin-bottom: 16px;
	}
	.chip.editable {
		border-style: dashed;
		border-color: var(--gilt);
		color: var(--vellum);
		background: transparent;
	}
	.chip.editable.selected {
		background: rgb(226 185 136 / 0.18);
		border-style: solid;
	}
	.chip.editable button::before {
		content: none !important;
	}
	.pencil {
		color: var(--gilt);
		margin-right: 4px;
	}
	.editor {
		margin-top: 14px;
		border-color: var(--gilt);
		gap: 14px;
	}
	.editor-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
	}
	.danger {
		color: var(--out);
		border-color: var(--out);
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.check input {
		width: 20px;
		min-height: 20px;
		height: 20px;
		accent-color: var(--gilt);
	}
	.into {
		grid-column: 1 / -1;
		letter-spacing: 0.08em;
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
	.chip {
		transition:
			background 220ms,
			color 220ms,
			border-color 220ms;
	}
	.chip:not(.on):hover {
		border-color: var(--gilt);
		color: var(--vellum);
	}
	.chip.on {
		border-color: var(--gilt);
		background: var(--gilt);
		color: var(--ink);
	}
	.chip.touched {
		animation: pop 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.figure {
		color: var(--gilt);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	@media (prefers-reduced-motion: reduce) {
		.chip.touched {
			animation: none;
		}
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
	.add {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		align-items: end;
		max-width: 720px;
	}
</style>
