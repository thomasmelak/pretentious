<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import Dropdown from '#lib/components/Dropdown.svelte';
	import IngredientIcon from '#lib/components/IngredientIcon.svelte';
	import { calm } from '#lib/motion.ts';
	import { CATEGORIES, FAMILIES, INGREDIENTS } from '#lib/shared/catalog.ts';
	import { LOW_AT, listNames, menuRows, slug, supplies } from '#lib/shared/logic.ts';
	import { formatMl, formatOz, ML_PER_OZ } from '#lib/shared/measure.ts';
	import type { Category, Family, Ingredient, Op } from '#lib/shared/types.ts';
	import { useIngredient, wizard } from '#lib/stores/wizard.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const STARTER = [
		'gin', 'vodka', 'white-rum', 'tequila', 'bourbon', 'campari', 'sweet-vermouth',
		'dry-vermouth', 'orange-liqueur', 'soda', 'tonic', 'ginger-beer', 'lime', 'lemon',
		'simple', 'angostura', 'mint', 'olives'
	];

	/** One typical ingredient per shelf, to draw the shelf's icon. */
	const SHELF_ICON: Record<Category, Pick<Ingredient, 'id' | 'name' | 'category' | 'family'>> = {
		spirit: { id: 'gin', name: 'Gin', category: 'spirit', family: 'gin' },
		liqueur: { id: 'campari', name: 'Campari', category: 'liqueur' },
		wine: { id: 'prosecco', name: 'Prosecco', category: 'wine' },
		mixer: { id: 'tonic', name: 'Tonic', category: 'mixer' },
		juice: { id: 'lime', name: 'Lime', category: 'juice' },
		syrup: { id: 'honey', name: 'Honey syrup', category: 'syrup' },
		bitters: { id: 'angostura', name: 'Angostura', category: 'bitters' },
		fresh: { id: 'mint', name: 'Mint', category: 'fresh' }
	};

	type Show = 'all' | 'in' | 'out' | 'counted' | 'low';
	const SHOW: { value: Show; label: string; hint: string }[] = [
		{ value: 'all', label: 'Everything', hint: 'The whole back bar' },
		{ value: 'in', label: 'In stock', hint: 'What you can pour now' },
		{ value: 'out', label: 'Out of stock', hint: "86'd or never bought" },
		{ value: 'counted', label: 'Counted', hint: 'Ingredients you keep a level for' },
		{ value: 'low', label: 'Running low', hint: `${LOW_AT} drinks or fewer left` }
	];
	const SHELVES = [
		{ value: 'all' as const, label: 'All shelves' },
		...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))
	];
	const FAMILY_OPTIONS = [
		{ value: '' as const, label: 'No family', hint: 'Not a base spirit' },
		...FAMILIES.map((f) => ({ value: f.id, label: f.label }))
	];
	const UNITS = [
		{ value: 'ml' as const, label: 'Millilitres', hint: 'Bottles, juice, syrups' },
		{ value: 'oz' as const, label: 'Ounces', hint: 'Saved as millilitres, 30 to the ounce' },
		{ value: 'each' as const, label: 'Pieces', hint: 'Limes, eggs, olives, sprigs' }
	];

	let search = $state('');
	let show = $state<Show>('all');
	let shelf = $state<Category | 'all'>('all');

	const stock = $derived(new Set(bar.core.stock));
	const supply = $derived(new Map(supplies(bar.core, bar.active).map((s) => [s.id, s])));
	const isLow = (id: string) => {
		const s = supply.get(id);
		return Boolean(s && s.drinksLeft !== null && s.drinksLeft <= LOW_AT && stock.has(id));
	};

	const matches = (i: Ingredient) => {
		const q = search.trim().toLowerCase();
		if (q && !i.name.toLowerCase().includes(q)) return false;
		if (show === 'in') return stock.has(i.id);
		if (show === 'out') return !stock.has(i.id);
		if (show === 'counted') return supply.has(i.id);
		if (show === 'low') return isLow(i.id);
		return true;
	};
	const groups = $derived(
		CATEGORIES.filter((c) => shelf === 'all' || c.id === shelf)
			.map((c) => ({ ...c, items: bar.ingredients.filter((i) => i.category === c.id && matches(i)) }))
			.filter((g) => g.items.length)
	);
	const offMenu = $derived(
		bar.active ? menuRows(bar.core, bar.active).filter((row) => !row.available) : []
	);

	// The find-or-add box: a dropdown of matches as you type.
	let finding = $state(false);
	let found = $state(0);
	const results = $derived(
		search.trim()
			? bar.ingredients
					.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
					.sort(
						(a, b) =>
							Number(!a.name.toLowerCase().startsWith(search.trim().toLowerCase())) -
								Number(!b.name.toLowerCase().startsWith(search.trim().toLowerCase())) ||
							a.name.localeCompare(b.name)
					)
					.slice(0, 7)
			: []
	);
	const exact = $derived(results.some((i) => i.name.toLowerCase() === search.trim().toLowerCase()));
	const choices = $derived(results.length + (search.trim() && !exact ? 1 : 0));

	function onFindKey(e: KeyboardEvent) {
		if (!choices) return;
		if (e.key === 'ArrowDown') found = (found + 1) % choices;
		else if (e.key === 'ArrowUp') found = (found - 1 + choices) % choices;
		else if (e.key === 'Enter') {
			if (found < results.length) {
				toggle(results[found].id);
				spotlight(results[found].id);
			} else startAdding(search.trim());
		} else if (e.key === 'Escape') finding = false;
		else return;
		finding = true;
		e.preventDefault();
	}

	let flash = $state('');
	function spotlight(id: string) {
		flash = '';
		requestAnimationFrame(() => {
			flash = id;
			document.getElementById(`ing-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		});
	}

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

	let touched = $state('');
	function toggle(id: string) {
		// Clear first so tapping the same card twice still plays the pop.
		touched = '';
		requestAnimationFrame(() => (touched = id));
		restock({ type: 'stock.set', ids: [id], inStock: !stock.has(id) });
	}

	// The open card: its level and its details.
	let openId = $state<string | null>(null);
	let editing = $state<Ingredient | null>(null);
	let unit = $state<'ml' | 'oz' | 'each'>('ml');
	let full = $state('');
	let left = $state('');
	const original = (id: string) => INGREDIENTS.find((i) => i.id === id);

	function openCard(item: Ingredient) {
		if (openId === item.id) {
			openId = null;
			return;
		}
		openId = item.id;
		editing = { ...item };
		const level = bar.core.levels?.[item.id];
		unit = level?.unit === 'each' ? 'each' : 'ml';
		full = level ? String(level.full) : '';
		left = level ? String(Math.max(0, level.left)) : '';
	}

	function switchUnit(next: 'ml' | 'oz' | 'each') {
		const convert = (text: string, factor: number) => {
			const n = Number(text);
			return text && Number.isFinite(n) ? String(Math.round(n * factor * 100) / 100) : text;
		};
		if (unit === 'ml' && next === 'oz') [full, left] = [convert(full, 1 / ML_PER_OZ), convert(left, 1 / ML_PER_OZ)];
		if (unit === 'oz' && next === 'ml') [full, left] = [convert(full, ML_PER_OZ), convert(left, ML_PER_OZ)];
		unit = next;
	}

	async function saveLevel(e: SubmitEvent) {
		e.preventDefault();
		if (!editing) return;
		const factor = unit === 'oz' ? ML_PER_OZ : 1;
		const f = Number(full) * factor;
		const l = left === '' ? f : Number(left) * factor;
		const ok = await bar.dispatch({
			type: 'level.set',
			id: editing.id,
			unit: unit === 'each' ? 'each' : 'ml',
			full: f,
			left: l
		});
		if (ok) toasts.push(`Counting ${editing.name}. Drinks made on the bartender screen use it up.`, 'ok');
	}

	async function refill(id: string, name: string) {
		if (await bar.dispatch({ type: 'level.restock', id })) {
			const level = bar.core.levels?.[id];
			if (level) left = String(unit === 'oz' ? level.full / ML_PER_OZ : level.full);
			toasts.push(`${name} restocked.`, 'ok');
		}
	}

	async function stopCounting(id: string, name: string) {
		if (await bar.dispatch({ type: 'level.clear', id })) {
			full = '';
			left = '';
			toasts.push(`No longer counting ${name}.`);
		}
	}

	async function saveEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!editing) return;
		const ok = await bar.dispatch({ type: 'ingredient.update', ingredient: editing });
		if (ok) toasts.push(`${editing.name} saved. Every recipe that uses it follows along.`, 'ok');
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
			openId = null;
		}
	}

	const amountText = (n: number, u: 'ml' | 'each') =>
		u === 'each'
			? `${Math.max(0, Math.round(n * 10) / 10)} left`
			: `${formatMl(Math.max(0, n) / ML_PER_OZ)} ml · ${formatOz(Math.max(0, n) / ML_PER_OZ)} oz`;

	// Adding a new ingredient.
	let name = $state('');
	let category = $state<Category>('spirit');
	let family = $state<Family | ''>('');
	let intoDraft = $state(true);
	let nameInput: HTMLInputElement | undefined = $state();
	const draftName = $derived($wizard.draft.name.trim() || 'your recipe');

	function startAdding(text: string) {
		name = text;
		finding = false;
		document.getElementById('add')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		requestAnimationFrame(() => nameInput?.focus());
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
		search = '';
		spotlight(id);
		name = '';
		family = '';
	}
</script>

{#snippet shelfIcon(id: Category | 'all')}
	{#if id === 'all'}
		<span class="all-icon" aria-hidden="true">▦</span>
	{:else}
		<IngredientIcon ingredient={SHELF_ICON[id]} size={22} />
	{/if}
{/snippet}

{#snippet familyIcon(id: Family | '')}
	<IngredientIcon ingredient={{ id: 'x', name: '', category: 'spirit', family: id || undefined }} size={22} />
{/snippet}

<div class="page-head">
	<div>
		<h1>Inventory</h1>
		<p class="muted">
			<b class="figure"><Count value={bar.core.stock.length} /></b> in stock ·
			<b class="figure"><Count value={bar.suggestions.ready.length} /></b>
			{bar.suggestions.ready.length === 1 ? 'drink' : 'drinks'} ready to pour. Tap a card when a bottle
			arrives or runs out.
		</p>
	</div>
	{#if bar.core.stock.length === 0}
		<button class="btn primary" onclick={() => restock({ type: 'stock.set', ids: STARTER, inStock: true })}>
			Stock a starter bar
		</button>
	{/if}
</div>

{#if $wizard.open}
	<div class="card draft" transition:slide={{ duration: calm(300) }}>
		<p>You are writing <b>{draftName}</b>. Ingredients you add below can go straight into it.</p>
		<a class="btn small primary" href="#/bar/recipes">Back to the recipe</a>
	</div>
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

<div class="toolbar">
	<div class="find">
		<label for="find" class="find-label">Find or add an ingredient</label>
		<input
			id="find"
			type="search"
			autocomplete="off"
			role="combobox"
			aria-expanded={finding && choices > 0}
			aria-controls="find-list"
			aria-activedescendant={finding && choices ? `find-${found}` : undefined}
			bind:value={search}
			placeholder="Gin, lime, bitters"
			oninput={() => {
				finding = true;
				found = 0;
			}}
			onfocus={() => (finding = true)}
			onblur={() => setTimeout(() => (finding = false), 150)}
			onkeydown={onFindKey}
		/>
		{#if finding && choices > 0}
			<ul id="find-list" class="results" role="listbox" transition:fly={{ y: -6, duration: calm(160) }}>
				{#each results as item, i (item.id)}
					<li id="find-{i}" role="option" aria-selected={i === found} class:active={i === found}>
						<button
							type="button"
							tabindex="-1"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => spotlight(item.id)}
						>
							<IngredientIcon ingredient={item} size={28} />
							<span class="text">
								{item.name}
								<small>{CATEGORIES.find((c) => c.id === item.category)?.label}</small>
							</span>
						</button>
						<button
							type="button"
							tabindex="-1"
							class="btn small"
							class:primary={!stock.has(item.id)}
							onmousedown={(e) => e.preventDefault()}
							onclick={() => {
								toggle(item.id);
								spotlight(item.id);
							}}
						>
							{stock.has(item.id) ? 'Remove' : 'Add'}
						</button>
					</li>
				{/each}
				{#if search.trim() && !exact}
					<li
						id="find-{results.length}"
						role="option"
						aria-selected={found === results.length}
						class:active={found === results.length}
						class="new"
					>
						<button
							type="button"
							tabindex="-1"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => startAdding(search.trim())}
						>
							<span class="plus" aria-hidden="true">+</span>
							<span class="text">Add “{search.trim()}” as a new ingredient</span>
						</button>
					</li>
				{/if}
			</ul>
		{/if}
	</div>
	<Dropdown label="Show" options={SHOW} bind:value={show} />
	<Dropdown label="Shelf" options={SHELVES} bind:value={shelf} icon={shelfIcon} />
</div>

{#each groups as group (group.id)}
	<section>
		<div class="section-head">
			<h2>{group.label}</h2>
			<span class="muted">
				{group.items.filter((i) => stock.has(i.id)).length} of {group.items.length} in stock
			</span>
		</div>
		<div class="cards">
			{#each group.items as item (item.id)}
				{@const s = supply.get(item.id)}
				<article
					id="ing-{item.id}"
					class="ing-card"
					class:on={stock.has(item.id)}
					class:low={isLow(item.id)}
					class:touched={touched === item.id}
					class:flash={flash === item.id}
					class:open={openId === item.id}
				>
					<button
						class="toggle"
						aria-pressed={stock.has(item.id)}
						aria-label={`${item.name}: ${stock.has(item.id) ? 'in stock, tap to mark out' : 'out, tap to add'}`}
						onclick={() => toggle(item.id)}
					>
						<span class="icon"><IngredientIcon ingredient={item} size={40} /></span>
						<span class="nm">{item.name}</span>
						{#if item.family}<span class="fam">{FAMILIES.find((f) => f.id === item.family)?.label}</span>{/if}
						<span class="state">
							{#if stock.has(item.id)}<span class="dot in"></span>In stock{:else}<span class="dot"></span>Out{/if}
						</span>
					</button>
					{#if s}
						<div class="meter" title={amountText(s.level.left, s.level.unit)}>
							<span style:width="{Math.max(0, Math.min(100, (s.level.left / s.level.full) * 100))}%"></span>
						</div>
						<p class="level">
							{#if s.drinksLeft !== null}
								≈ {s.drinksLeft} {s.drinksLeft === 1 ? 'drink' : 'drinks'}
							{:else}
								{amountText(s.level.left, s.level.unit)}
							{/if}
						</p>
					{/if}
					<button
						class="more"
						aria-label={`Count or edit ${item.name}`}
						aria-expanded={openId === item.id}
						onclick={() => openCard(item)}
					>
						<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
							<circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" />
						</svg>
					</button>
				</article>
			{/each}
		</div>

		{#if openId && editing && group.items.some((i) => i.id === openId)}
			{@const s = supply.get(openId)}
			<div class="card detail" transition:slide={{ duration: calm(250) }}>
				<div class="detail-head">
					<IngredientIcon ingredient={editing} size={44} />
					<div>
						<p class="eyebrow">{original(editing.id)?.name ?? editing.name}</p>
						<h3>{s ? amountText(s.level.left, s.level.unit) : 'Not counted'}</h3>
					</div>
					<button class="btn small quiet" onclick={() => (openId = null)}>Close</button>
				</div>

				<form class="part" onsubmit={saveLevel}>
					<p class="eyebrow">Count it</p>
					<p class="muted small">
						Say what a full restock holds and what is left. Drinks marked made on the bartender screen
						use it up, and the bartender is warned when about {LOW_AT} drinks are left.
					</p>
					<div class="fields">
						<label>Full <input type="number" min="0" step="any" bind:value={full} required placeholder={unit === 'each' ? '24' : unit === 'oz' ? '25' : '700'} /></label>
						<label>Left now <input type="number" min="0" step="any" bind:value={left} placeholder="Full" /></label>
						<Dropdown label="Counted in" options={UNITS} value={unit} onchange={switchUnit} />
					</div>
					<div class="row">
						<button class="btn small primary">{s ? 'Save count' : 'Start counting'}</button>
						{#if s}
							<button type="button" class="btn small" onclick={() => editing && refill(editing.id, editing.name)}>Restocked</button>
							<button type="button" class="btn small quiet" onclick={() => editing && stopCounting(editing.id, editing.name)}>Stop counting</button>
						{/if}
					</div>
				</form>

				<form class="part" onsubmit={saveEdit}>
					<p class="eyebrow">Details</p>
					<div class="fields">
						<label>Name <input bind:value={editing.name} required maxlength="60" /></label>
						<Dropdown
							label="Shelf"
							options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
							bind:value={editing.category}
							icon={shelfIcon}
						/>
						{#if editing.category === 'spirit'}
							<Dropdown
								label="Spirit family"
								options={FAMILY_OPTIONS}
								value={editing.family ?? ''}
								onchange={(v) => editing && (editing.family = v || undefined)}
								icon={familyIcon}
							/>
						{/if}
					</div>
					<div class="row">
						<button class="btn small primary">Save details</button>
						{#if !original(editing.id)}
							<button type="button" class="btn small quiet danger" onclick={removeEditing}>Delete</button>
						{:else if group.items.find((i) => i.id === openId)?.edited}
							<button type="button" class="btn small quiet" onclick={removeEditing}>Restore original</button>
						{/if}
					</div>
				</form>
			</div>
		{/if}
	</section>
{:else}
	<p class="empty" in:fade={{ duration: calm(200) }}>
		Nothing matches.
		{#if search.trim()}<button class="btn small" onclick={() => startAdding(search.trim())}>Add “{search.trim()}”</button>{/if}
	</p>
{/each}

<section id="add">
	<div class="section-head"><h2>Add an ingredient</h2></div>
	<form class="add" onsubmit={add}>
		<label>
			Name
			<input bind:this={nameInput} bind:value={name} required maxlength="60" placeholder="Yuzu juice" />
		</label>
		<Dropdown
			label="Shelf"
			options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
			bind:value={category}
			icon={shelfIcon}
		/>
		{#if category === 'spirit'}
			<Dropdown label="Spirit family" options={FAMILY_OPTIONS} bind:value={family} icon={familyIcon} />
		{/if}
		<button class="btn">
			{#if name.trim()}
				<IngredientIcon ingredient={{ id: slug(name), name, category, family: family || undefined }} size={22} />
			{/if}
			Add to stock
		</button>
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
	.warn ul {
		margin: 0;
		padding-left: 18px;
	}
	.draft {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		border-color: var(--gilt);
		margin-bottom: 24px;
	}
	.figure {
		color: var(--gilt);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.toolbar {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px;
		align-items: end;
		margin-bottom: 32px;
		position: relative;
		z-index: 4;
	}
	@media (max-width: 700px) {
		.toolbar {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.find {
			grid-column: 1 / -1;
		}
	}
	.find {
		position: relative;
		display: grid;
		gap: 6px;
	}
	.find-label {
		display: block;
	}
	.results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 20;
		margin: 6px 0 0;
		padding: 6px;
		list-style: none;
		background: var(--olive-deep);
		border: 1px solid var(--gilt);
		box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
	}
	.results li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 2px 4px;
	}
	.results li.active {
		background: rgb(226 185 136 / 0.14);
	}
	.results li > button:first-child {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 6px 6px;
		font: inherit;
		font-size: 17px;
		text-align: left;
		color: var(--vellum);
		background: none;
		border: 0;
		cursor: pointer;
	}
	.results .text {
		display: grid;
	}
	.results small {
		color: var(--muted);
		font-size: 13px;
	}
	.results .new button {
		color: var(--gilt);
	}
	.plus {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 1px dashed var(--gilt);
		border-radius: 50%;
	}
	.all-icon {
		width: 22px;
		text-align: center;
		color: var(--gilt);
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.ing-card {
		position: relative;
		display: grid;
		background: var(--olive-deep);
		border: 1px solid var(--line);
		transition:
			border-color 200ms,
			background 200ms,
			transform 150ms,
			opacity 200ms;
	}
	.ing-card:not(.on) {
		opacity: 0.7;
	}
	.ing-card:not(.on) .icon {
		filter: grayscale(0.85);
	}
	.ing-card.on {
		background: var(--olive-raised);
		border-color: var(--gilt-deep);
	}
	.ing-card:hover {
		border-color: var(--gilt);
		opacity: 1;
		transform: translateY(-2px);
	}
	.ing-card.low {
		border-color: var(--out);
	}
	.ing-card.open {
		border-color: var(--gilt);
		box-shadow: 0 0 0 1px var(--gilt);
	}
	.ing-card.touched {
		animation: pop 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.ing-card.flash {
		animation: glow 1.4s ease-out;
	}
	@keyframes glow {
		0% {
			box-shadow: 0 0 0 0 rgb(226 185 136 / 0.8);
		}
		100% {
			box-shadow: 0 0 0 16px rgb(226 185 136 / 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ing-card.touched,
		.ing-card.flash {
			animation: none;
		}
		.ing-card:hover {
			transform: none;
		}
	}
	.toggle {
		display: grid;
		justify-items: start;
		gap: 6px;
		padding: 14px 14px 12px;
		font: inherit;
		text-align: left;
		color: var(--vellum);
		background: none;
		border: 0;
		cursor: pointer;
		min-height: 120px;
	}
	.icon {
		transition: filter 250ms;
	}
	.nm {
		font-size: 17px;
		line-height: 1.2;
		padding-right: 22px;
	}
	.state {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.on .state {
		color: var(--available);
	}
	.fam {
		margin-top: -4px;
		font-family: var(--f-serif);
		font-style: italic;
		font-size: 15px;
		color: var(--muted);
	}
	.state {
		margin-top: auto;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1px solid currentColor;
	}
	.dot.in {
		background: currentColor;
	}
	.more {
		position: absolute;
		top: 6px;
		right: 6px;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		color: var(--muted);
		fill: currentColor;
		background: none;
		border: 1px solid transparent;
		cursor: pointer;
	}
	.more:hover,
	.more[aria-expanded='true'] {
		color: var(--gilt);
		border-color: var(--line);
	}
	.meter {
		height: 4px;
		margin: 0 14px;
		background: rgb(255 255 255 / 0.1);
	}
	.meter span {
		display: block;
		height: 100%;
		background: var(--available);
		transition: width 400ms;
	}
	.low .meter span {
		background: var(--out);
	}
	.level {
		margin: 6px 14px 12px;
		font-size: 13px;
		color: var(--muted);
	}
	.low .level {
		color: var(--out);
	}
	.detail {
		margin-top: 14px;
		border-color: var(--gilt);
		gap: 18px;
		position: relative;
		z-index: 3;
	}
	.detail-head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.detail-head > div {
		flex: 1;
	}
	.part {
		display: grid;
		gap: 10px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
	.small {
		font-size: 14px;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
		align-items: end;
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
	.add {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		align-items: end;
		max-width: 760px;
	}
	.empty .btn {
		margin-left: 8px;
	}
</style>
