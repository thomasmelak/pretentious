<!--
	The recipe wizard. Its state lives in the `wizard` store, so it is still here, half
	written, after a trip to the inventory or the till.
-->
<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import AmountInput from '#lib/components/AmountInput.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import ProfileIcon from '#lib/components/ProfileIcon.svelte';
	import { money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { CATEGORIES, FAMILIES, GLASSES, PROFILES } from '#lib/shared/catalog.ts';
	import { slug } from '#lib/shared/logic.ts';
	import { measures } from '#lib/shared/measure.ts';
	import type { Category, Family } from '#lib/shared/types.ts';
	import {
		close,
		goTo,
		problems,
		STEPS,
		TECHNIQUES,
		toggleIngredient,
		toRecipe,
		useIngredient,
		wizard,
		type Draft
	} from '#lib/stores/wizard.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const SWATCHES = [
		'#F3EBD3',
		'#E9E3C4',
		'#DCE3B0',
		'#CFE0A8',
		'#EDD38A',
		'#E0B458',
		'#F08A3C',
		'#EFA58E',
		'#D8597A',
		'#B8332A',
		'#8E3A22',
		'#4A2E1C'
	];

	/** Change a copy of the draft and put it back, so everything derived from it updates. */
	function patch(change: (d: Draft) => void) {
		wizard.update((w) => {
			const draft = structuredClone(w.draft);
			change(draft);
			return { ...w, draft };
		});
	}

	const w = $derived($wizard);
	const d = $derived(w.draft);
	const issues = $derived(problems(w));
	const canSave = $derived(Object.keys(issues).length === 0);
	const chosen = $derived(new Set(d.rows.map((r) => r.id)));
	const stock = $derived(new Set(bar.core.stock));
	const byId = $derived(new Map(bar.ingredients.map((i) => [i.id, i])));
	const preview = $derived(toRecipe(w));

	// Ingredient cards, by shelf.
	let search = $state('');
	let onlyStocked = $state(false);
	const shelves = $derived(
		CATEGORIES.map((c) => ({
			...c,
			items: bar.ingredients.filter(
				(i) =>
					i.category === c.id &&
					(!onlyStocked || stock.has(i.id) || chosen.has(i.id)) &&
					i.name.toLowerCase().includes(search.trim().toLowerCase())
			)
		})).filter((s) => s.items.length)
	);

	// A new ingredient, without leaving the wizard.
	let adding = $state(false);
	let newName = $state('');
	let newShelf = $state<Category>('spirit');
	let newFamily = $state<Family | ''>('');

	async function addIngredient(e: SubmitEvent) {
		e.preventDefault();
		const id = slug(newName);
		if (!id) return;
		const ok = await bar.dispatch({
			type: 'ingredient.add',
			id,
			name: newName,
			category: newShelf,
			family: newFamily || undefined
		});
		if (!ok) return;
		useIngredient(id);
		toasts.push(`${newName.trim()} is on the shelf and in the glass.`, 'ok');
		newName = '';
		newFamily = '';
		adding = false;
	}

	async function save() {
		if (!canSave) {
			goTo(Number(Object.keys(issues)[0]));
			return;
		}
		const recipe = toRecipe(w);
		const editing = w.editing;
		const ok = await bar.dispatch(
			editing ? { type: 'recipe.update', recipe } : { type: 'recipe.add', recipe }
		);
		if (ok) {
			toasts.push(
				editing ? `${recipe.name} saved. Every menu it is on now pours it this way.` : `${recipe.name} joins the library.`,
				'ok'
			);
			close();
		}
	}

	function discard() {
		if (confirm(w.editing ? 'Stop editing? Your changes will be lost.' : 'Throw away this draft?')) {
			close();
		}
	}

	const profile = $derived(PROFILES.find((p) => p.id === d.profile));
</script>

<section class="wizard card" aria-labelledby="wizard-title" transition:slide={{ duration: calm(350) }}>
	<header class="spread head">
		<div>
			<p class="eyebrow">{w.editing ? 'Editing' : 'New house recipe'}</p>
			<h2 id="wizard-title">{d.name.trim() || w.editingName || 'Untitled masterpiece'}</h2>
		</div>
		<button type="button" class="btn small quiet" onclick={discard}>
			{w.editing ? 'Cancel' : 'Discard'}
		</button>
	</header>

	<ol class="steps">
		{#each STEPS as label, n (label)}
			<li>
				<button
					type="button"
					class:current={w.step === n}
					class:done={n < w.step && !issues[n]}
					class:issue={n < w.step && issues[n]}
					aria-current={w.step === n ? 'step' : undefined}
					onclick={() => goTo(n)}
				>
					<span class="num">{n + 1}</span>
					<span class="label">{label}</span>
				</button>
			</li>
		{/each}
	</ol>

	<div class="body">
		<div class="stage">
			{#key w.step}
				<div class="step" in:fly={{ x: 24, duration: calm(300) }}>
					{#if w.step === 0}
						<label>
							Name
							<input
								value={d.name}
								oninput={(e) => patch((x) => (x.name = e.currentTarget.value))}
								maxlength="80"
								placeholder="Chocolate Matador"
							/>
						</label>

						<fieldset>
							<legend class="eyebrow">Flavour profile</legend>
							<div class="profiles">
								{#each PROFILES as p (p.id)}
									<button
										type="button"
										class="pick"
										aria-pressed={d.profile === p.id}
										onclick={() => patch((x) => (x.profile = p.id))}
									>
										<ProfileIcon profile={p.id} size={26} />
										<b>{p.label}</b>
										<span>{p.blurb}</span>
									</button>
								{/each}
							</div>
						</fieldset>

						<fieldset>
							<legend class="eyebrow">Made by</legend>
							<div class="chips">
								{#each TECHNIQUES as t (t)}
									<button
										type="button"
										class="chip-btn"
										aria-pressed={d.technique === t}
										onclick={() => patch((x) => (x.technique = t))}>{t}</button
									>
								{/each}
							</div>
						</fieldset>

						<label class="price-field">
							Price ({bar.core.currency})
							<input
								type="number"
								min="0"
								step="0.5"
								value={d.price}
								oninput={(e) => patch((x) => (x.price = Number(e.currentTarget.value)))}
							/>
						</label>
					{:else if w.step === 1}
						{#if d.rows.length}
							<div class="chosen">
								<p class="eyebrow">In the glass</p>
								<ul>
									{#each d.rows as row, n (row.id)}
										<li transition:slide={{ duration: calm(200) }}>
											<span class="ing-name">{byId.get(row.id)?.name ?? row.id}</span>
											<AmountInput
												value={row.amount}
												label={byId.get(row.id)?.name ?? row.id}
												onchange={(v) => patch((x) => (x.rows[n].amount = v))}
											/>
											<label class="check" title="Optional ingredients never take the drink off the menu">
												<input
													type="checkbox"
													checked={row.optional}
													onchange={(e) => patch((x) => (x.rows[n].optional = e.currentTarget.checked))}
												/>
												Optional
											</label>
											<button
												type="button"
												class="btn small quiet"
												aria-label={`Take ${byId.get(row.id)?.name ?? row.id} out`}
												onclick={() => toggleIngredient(row.id)}>×</button
											>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<div class="finder">
							<label>
								Find an ingredient
								<input type="search" bind:value={search} placeholder="Tequila, cacao, lime" />
							</label>
							<label class="check">
								<input type="checkbox" bind:checked={onlyStocked} /> Only what is in stock
							</label>
						</div>

						{#each shelves as shelf (shelf.id)}
							<div class="shelf">
								<p class="eyebrow">{shelf.label}</p>
								<div class="cards">
									{#each shelf.items as i (i.id)}
										<button
											type="button"
											class="ing"
											aria-pressed={chosen.has(i.id)}
											onclick={() => toggleIngredient(i.id)}
										>
											<span class="tick" aria-hidden="true">{chosen.has(i.id) ? '✓' : '+'}</span>
											<span class="nm">{i.name}</span>
											<span class="stock" class:in={stock.has(i.id)}>
												{stock.has(i.id) ? 'In stock' : 'Not stocked'}
											</span>
										</button>
									{/each}
								</div>
							</div>
						{:else}
							<p class="empty">Nothing on the shelves matches "{search}".</p>
						{/each}

						<div class="add-new">
							<button
								type="button"
								class="btn small"
								aria-expanded={adding}
								onclick={() => {
									adding = !adding;
									if (adding && search.trim()) newName = search.trim();
								}}
							>
								Not on the shelf? Add it
							</button>
							<a class="muted" href="#/bar/inventory">
								Or stock it on the Inventory screen. This draft will wait for you.
							</a>
						</div>
						{#if adding}
							<form class="new-ing" onsubmit={addIngredient} transition:slide={{ duration: calm(250) }}>
								<label>
									Name
									<input bind:value={newName} required maxlength="60" placeholder="Olmeca Chocolate" />
								</label>
								<label>
									Shelf
									<select bind:value={newShelf}>
										{#each CATEGORIES as c (c.id)}
											<option value={c.id}>{c.label}</option>
										{/each}
									</select>
								</label>
								{#if newShelf === 'spirit'}
									<label>
										Spirit family
										<select bind:value={newFamily}>
											<option value="">None</option>
											{#each FAMILIES as f (f.id)}
												<option value={f.id}>{f.label}</option>
											{/each}
										</select>
									</label>
								{/if}
								<button class="btn small primary">Add and use it</button>
							</form>
						{/if}
					{:else if w.step === 2}
						<fieldset>
							<legend class="eyebrow">Glass</legend>
							<div class="glasses">
								{#each GLASSES as g (g)}
									<button
										type="button"
										class="pick glass-pick"
										aria-pressed={d.glass === g}
										onclick={() => patch((x) => (x.glass = g))}
									>
										<GlassIcon glass={g} size={48} color={d.glass === g ? d.color : undefined} />
										<b>{g}</b>
									</button>
								{/each}
							</div>
						</fieldset>

						<fieldset>
							<legend class="eyebrow">Colour on the guest menu</legend>
							<div class="swatches">
								{#each SWATCHES as c (c)}
									<button
										type="button"
										class="swatch"
										style:background={c}
										aria-label={`Colour ${c}`}
										aria-pressed={d.color.toUpperCase() === c}
										onclick={() => patch((x) => (x.color = c))}
									></button>
								{/each}
								<label class="custom-colour">
									<input
										type="color"
										value={d.color}
										oninput={(e) => patch((x) => (x.color = e.currentTarget.value.toUpperCase()))}
									/>
									<span>Any colour</span>
								</label>
							</div>
						</fieldset>

						<label>
							Garnish
							<input
								value={d.garnish}
								oninput={(e) => patch((x) => (x.garnish = e.currentTarget.value))}
								maxlength="80"
								placeholder="Grated dark chocolate"
							/>
						</label>
					{:else}
						<label>
							Tasting note, shown to guests
							<input
								value={d.note}
								oninput={(e) => patch((x) => (x.note = e.currentTarget.value))}
								maxlength="200"
								placeholder="One smug sentence."
							/>
						</label>
						<label>
							Method
							<textarea
								rows="4"
								maxlength="600"
								value={d.method}
								oninput={(e) => patch((x) => (x.method = e.currentTarget.value))}
								placeholder="Shake hard with ice. Fine strain into a chilled coupe."
							></textarea>
						</label>
					{/if}

					{#if issues[w.step] && (w.step > 0 || d.name.trim())}
						<p class="hint">{issues[w.step]}</p>
					{/if}
				</div>
			{/key}

			<div class="nav row">
				{#if w.step > 0}
					<button type="button" class="btn quiet" onclick={() => goTo(w.step - 1)}>Back</button>
				{/if}
				{#if w.step < STEPS.length - 1}
					<button type="button" class="btn" onclick={() => goTo(w.step + 1)}>
						Next: {STEPS[w.step + 1]}
					</button>
				{/if}
				<button
					type="button"
					class="btn primary"
					onclick={save}
					aria-disabled={!canSave}
					title={canSave ? undefined : Object.values(issues).join(' ')}
				>
					{w.editing ? 'Save changes' : 'Save recipe'}
				</button>
			</div>
		</div>

		<aside class="preview" aria-label="How guests will see it">
			<p class="eyebrow">On the guest menu</p>
			<div class="pv">
				<GlassIcon glass={d.glass} size={72} color={d.color} fizz={d.profile === 'long'} />
				<div>
					<p class="eyebrow">{preview.style}</p>
					<div class="spread">
						<h3>{preview.name || 'Your drink'}</h3>
						<span class="price">{money(preview.price, bar.core.currency)}</span>
					</div>
					{#if profile}
						<p class="badge-line"><ProfileIcon profile={profile.id} size={18} /> {profile.label}</p>
					{/if}
				</div>
			</div>
			{#if preview.note}<p class="note">{preview.note}</p>{/if}
			{#if d.rows.length}
				<ul class="measures">
					{#each d.rows as row (row.id)}
						{@const [first, second] = measures(row.amount || '')}
						<li>
							<span>{byId.get(row.id)?.name ?? row.id}{row.optional ? ' (optional)' : ''}</span>
							<span class="m">{first || '…'}{#if second}<small>{second}</small>{/if}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
</section>

<style>
	.wizard {
		border-color: var(--gilt);
		margin-bottom: 32px;
		gap: 18px;
		scroll-margin-top: 80px;
	}
	.head h2 {
		font-size: 32px;
		overflow-wrap: anywhere;
	}
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.steps button {
		all: unset;
		box-sizing: border-box;
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 8px 8px;
		border-bottom: 2px solid var(--line);
		color: var(--muted);
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			color 200ms,
			border-color 200ms;
	}
	.steps button:focus-visible {
		outline: 2px solid var(--peacock);
	}
	.steps .num {
		width: 26px;
		height: 26px;
		flex: none;
		border-radius: 50%;
		border: 1px solid currentColor;
		display: grid;
		place-items: center;
		padding-top: 2px;
		font-size: 12px;
	}
	.steps .current {
		color: var(--gilt);
		border-bottom-color: var(--gilt);
	}
	.steps .done {
		color: var(--available);
		border-bottom-color: var(--available);
	}
	.steps .issue {
		color: var(--out);
		border-bottom-color: var(--out);
	}
	@media (max-width: 640px) {
		.steps .label {
			display: none;
		}
		.steps .current .label {
			display: inline;
		}
		.steps {
			grid-template-columns: auto auto auto auto;
			justify-content: start;
		}
	}

	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 28px;
		align-items: start;
	}
	@media (max-width: 900px) {
		.body {
			grid-template-columns: 1fr;
		}
	}
	.stage {
		display: grid;
		gap: 20px;
		min-width: 0;
	}
	.step {
		display: grid;
		gap: 20px;
		min-width: 0;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 10px;
	}

	.pick {
		font: inherit;
		color: var(--vellum);
		background: var(--olive-deep);
		border: 1px solid var(--line);
		padding: 14px;
		text-align: left;
		cursor: pointer;
		display: grid;
		gap: 4px;
		align-content: start;
		transition:
			border-color 200ms,
			background 200ms,
			transform 150ms;
	}
	.pick:hover {
		border-color: var(--gilt);
		transform: translateY(-2px);
	}
	.pick[aria-pressed='true'] {
		border-color: var(--gilt);
		background: rgb(226 185 136 / 0.14);
		box-shadow: inset 0 0 0 1px var(--gilt);
	}
	.pick :global(.profile-icon),
	.pick b {
		color: var(--gilt);
	}
	.pick b {
		font-family: var(--f-display);
		font-weight: 400;
		font-size: 21px;
		line-height: 1.2;
	}
	.pick span {
		font-size: 14px;
		color: var(--muted);
	}
	.profiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip-btn {
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		background: none;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 10px 16px 8px;
		min-height: 42px;
		cursor: pointer;
	}
	.chip-btn[aria-pressed='true'] {
		background: var(--gilt);
		border-color: var(--gilt);
		color: var(--ink);
	}
	.price-field {
		max-width: 200px;
	}

	.chosen {
		background: var(--olive-deep);
		border: 1px solid var(--line);
		padding: 14px;
	}
	.chosen ul {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
	}
	.chosen li {
		display: grid;
		grid-template-columns: minmax(8em, 1fr) auto auto auto;
		gap: 10px;
		align-items: center;
		padding: 8px 0;
		border-top: 1px solid var(--line);
	}
	.ing-name {
		font-family: var(--f-display);
		font-size: 20px;
		color: var(--gilt);
		line-height: 1.2;
	}
	@media (max-width: 720px) {
		.chosen li {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}
		.chosen li :global(.amount) {
			grid-column: 1 / -1;
			grid-row: 2;
		}
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
	.finder {
		display: grid;
		grid-template-columns: minmax(0, 360px) auto;
		gap: 12px 20px;
		align-items: end;
	}
	@media (max-width: 560px) {
		.finder {
			grid-template-columns: 1fr;
		}
	}
	.shelf .eyebrow {
		margin-bottom: 8px;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 8px;
	}
	.ing {
		font: inherit;
		text-align: left;
		color: var(--vellum);
		background: var(--olive-deep);
		border: 1px solid var(--line);
		padding: 10px 12px 8px;
		min-height: 64px;
		cursor: pointer;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 8px;
		align-content: start;
		transition:
			border-color 180ms,
			background 180ms,
			transform 150ms;
	}
	.ing:hover {
		border-color: var(--gilt);
	}
	.ing:active {
		transform: scale(0.97);
	}
	.ing .nm {
		grid-column: 1;
		grid-row: 1;
		font-size: 16px;
		line-height: 1.25;
	}
	.ing .tick {
		grid-column: 2;
		grid-row: 1;
		color: var(--gilt);
		font-weight: 600;
	}
	.ing .stock {
		grid-column: 1 / -1;
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.ing .stock.in {
		color: var(--available);
	}
	.ing[aria-pressed='true'] {
		background: var(--gilt);
		border-color: var(--gilt);
		color: var(--ink);
	}
	.ing[aria-pressed='true'] .tick,
	.ing[aria-pressed='true'] .stock {
		color: var(--ink);
	}
	.add-new {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 16px;
		align-items: center;
	}
	.add-new a {
		font-size: 15px;
	}
	.new-ing {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
		align-items: end;
		padding: 14px;
		border: 1px dashed var(--gilt);
	}

	.glasses {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: 10px;
	}
	.glass-pick {
		justify-items: center;
		text-align: center;
		padding: 16px 8px 12px;
	}
	.glass-pick b {
		font-size: 18px;
	}
	.glass-pick :global(.glass) {
		transition: transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.glass-pick:hover :global(.glass),
	.glass-pick[aria-pressed='true'] :global(.glass) {
		transform: rotate(-8deg);
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	.swatch {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid var(--olive-deep);
		box-shadow: 0 0 0 1px var(--line);
		cursor: pointer;
		transition: transform 150ms;
	}
	.swatch:hover {
		transform: scale(1.1);
	}
	.swatch[aria-pressed='true'] {
		box-shadow: 0 0 0 2px var(--gilt);
		transform: scale(1.1);
	}
	.custom-colour {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.custom-colour input {
		width: 44px;
		height: 44px;
		padding: 2px;
		cursor: pointer;
	}

	.hint {
		color: var(--out);
		font-size: 15px;
	}
	.nav {
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.nav .primary[aria-disabled='true'] {
		opacity: 0.55;
	}

	.preview {
		position: sticky;
		top: 90px;
		background: var(--olive);
		border: 1px solid var(--line);
		padding: 18px;
		display: grid;
		gap: 12px;
	}
	.pv {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 14px;
		align-items: center;
	}
	.pv h3 {
		font-size: 26px;
		overflow-wrap: anywhere;
	}
	.badge-line {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--gilt);
		font-size: 14px;
		margin-top: 4px;
	}
	.measures {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 15px;
	}
	.measures li {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		padding: 6px 0;
		border-top: 1px solid var(--line);
	}
	.measures .m {
		text-align: right;
		color: var(--gilt);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.measures small {
		display: block;
		color: var(--muted);
		font-size: 13px;
	}
	@media (max-width: 900px) {
		.preview {
			position: static;
		}
	}
</style>
