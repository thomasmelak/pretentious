<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly, scale } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import DrinkIllustration from '#lib/components/DrinkIllustration.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import { calm } from '#lib/motion.ts';
	import {
		countName,
		DEFAULT_COLOR,
		orderNumbers,
		profileOf,
		queue,
		queuedCounts,
		rounds,
		roundsText,
		type Round
	} from '#lib/shared/logic.ts';
	import { measures, scaled } from '#lib/shared/measure.ts';
	import type { Order, Recipe } from '#lib/shared/types.ts';
	import { pour } from '#lib/stores/pour.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const event = $derived(bar.active);
	const waiting = $derived(event ? queue(bar.orders, event.id) : []);
	const readyCount = $derived(event ? queue(bar.orders, event.id, 'ready').length : 0);
	const numbers = $derived(orderNumbers(bar.orders));
	const order = $derived<Order | undefined>(waiting[0]);
	const upNext = $derived(waiting.slice(1));
	const drinksWaiting = $derived(waiting.reduce((n, o) => n + o.lines.reduce((m, l) => m + l.qty, 0), 0));

	const recipes = $derived(new Map(bar.recipes.map((r) => [r.id, r])));
	const list = $derived(order ? rounds(order) : []);
	const done = $derived(order && $pour.orderId === order.id ? $pour.done : []);
	const current = $derived<Round | undefined>(list.find((r) => !done.includes(r.recipeId)));
	const allMade = $derived(list.length > 0 && !current);
	const recipe = $derived<Recipe | undefined>(current ? recipes.get(current.recipeId) : undefined);
	/** More of the same drink further down the queue: worth making in one go. */
	const later = $derived(current ? (queuedCounts(upNext).get(current.recipeId) ?? 0) : 0);

	let busy = $state(false);
	let lastReady = $state<Order | null>(null);
	let now = $state(Date.now());

	onMount(() => {
		const stopWatching = bar.watch(4000);
		const tick = setInterval(() => (now = Date.now()), 15_000);
		return () => {
			stopWatching();
			clearInterval(tick);
		};
	});

	const number = (o: Order) => numbers.get(o.id) ?? '';

	function waited(o: Order) {
		const minutes = Math.max(0, Math.floor((now - new Date(o.at).getTime()) / 60_000));
		return minutes < 1 ? 'just now' : minutes === 1 ? '1 min' : `${minutes} min`;
	}

	const colorOf = (r?: Recipe) => r?.color || DEFAULT_COLOR;
	const fizzy = (r?: Recipe) => (r ? profileOf(r) === 'long' : false);

	function makeRound() {
		if (!order || !current) return;
		pour.set({ orderId: order.id, done: [...done, current.recipeId] });
	}

	async function markReady() {
		if (!order || !allMade || busy) return;
		busy = true;
		const finished = order;
		const ok = await bar.setStatus(finished, 'ready');
		busy = false;
		if (!ok) return;
		lastReady = finished;
		pour.set({ orderId: '', done: [] });
		toasts.push(`Order ${number(finished)} is ready for pickup.`, 'ok');
	}

	/** Step back: unmake the last drink, or pull the order just sent back onto the bar. */
	async function undo() {
		if (order && done.length) {
			pour.set({ orderId: order.id, done: done.slice(0, -1) });
			return;
		}
		if (!lastReady || busy) return;
		busy = true;
		const back = lastReady;
		const ok = await bar.setStatus(back, 'waiting');
		busy = false;
		if (!ok) return;
		lastReady = null;
		// It is the oldest order, so it comes straight back to the top, all drinks made.
		pour.set({ orderId: back.id, done: rounds(back).map((r) => r.recipeId) });
		toasts.push(`Order ${number(back)} is back on the bar.`);
	}

	function onKey(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.code === 'Space' || e.key === ' ') {
			e.preventDefault();
			if (e.repeat) return;
			// A focused button would also be clicked by the space bar when it comes back up.
			if (target instanceof HTMLButtonElement) target.blur();
			if (current) makeRound();
			else markReady();
		} else if (e.key === 'Backspace') {
			e.preventDefault();
			undo();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="page-head">
	<div>
		<h1>Bartender</h1>
		<p class="muted">
			{#if !event}
				No event is live. <a href="#/bar/events">Choose one</a> to start the queue.
			{:else if waiting.length}
				{waiting.length} {waiting.length === 1 ? 'order' : 'orders'} waiting, {drinksWaiting}
				{drinksWaiting === 1 ? 'drink' : 'drinks'} to make.
			{:else}
				Nothing waiting. New orders appear here by themselves.
			{/if}
		</p>
	</div>
	<p class="keys muted" aria-hidden="true">
		<kbd>Space</kbd> done <span class="sep"></span> <kbd>⌫</kbd> undo
	</p>
</div>

{#if event}
	{#if order}
		<div class="stage">
			<!-- The order: every drink in it, and how far along it is. -->
			<section class="card order" aria-label="Current order">
				<div class="spread">
					<h2>Order {number(order)}</h2>
					<span class="eyebrow">{waited(order)}</span>
				</div>
				<ol class="rounds">
					{#each list as r (r.recipeId)}
						{@const rec = recipes.get(r.recipeId)}
						{@const state = done.includes(r.recipeId) ? 'done' : r === current ? 'now' : 'later'}
						<li class={state} animate:flip={{ duration: calm(250) }}>
							<GlassIcon glass={rec?.glass} size={26} color={colorOf(rec)} fizz={fizzy(rec)} />
							<span class="qty">{r.qty}×</span>
							<span class="name">{r.name}</span>
							<span class="state" aria-label={state === 'done' ? 'made' : state === 'now' ? 'making now' : 'to make'}>
								{state === 'done' ? '✓' : state === 'now' ? '●' : ''}
							</span>
						</li>
					{/each}
				</ol>
				<p class="muted small">
					{list.reduce((n, r) => n + r.qty, 0)} drinks in this order, {order.payment === 'open' ? 'open bar' : `paid ${order.payment}`}.
				</p>
			</section>

			<!-- The drink being made, front and centre. -->
			<section class="centre" aria-live="polite">
				{#if current}
					{#key `${order.id}/${current.recipeId}`}
						<div class="hero" in:fly={{ x: 80, duration: calm(450) }}>
							<span class="make" in:scale={{ start: 0.6, duration: calm(400), delay: calm(200) }}>
								<small>Make</small>{current.qty}
							</span>
							<DrinkIllustration
								glass={recipe?.glass}
								color={colorOf(recipe)}
								garnish={recipe?.garnish}
								method={recipe?.method}
								fizz={fizzy(recipe)}
								size={240}
							/>
							<h2 class="drink-name">{countName(current.qty, current.name)}</h2>
							<p class="muted">
								{recipe?.glass ?? 'Glass'}{recipe?.garnish ? ` · ${recipe.garnish}` : ''}
							</p>
						</div>
					{/key}
					<button class="btn primary done" onclick={makeRound}>
						{current.qty === 1 ? 'Made it' : `Made all ${current.qty}`}
						<kbd>Space</kbd>
					</button>
					{#if later}
						<p class="batch" transition:fade={{ duration: calm(200) }}>
							{countName(later, current.name).replace(/^\d+ /, `${later} more `)} {later === 1 ? 'is' : 'are'} waiting in later orders.
							Worth making together.
						</p>
					{/if}
				{:else if allMade}
					<div class="confirm" in:scale={{ start: 0.9, duration: calm(350) }}>
						<div class="glasses" aria-hidden="true">
							{#each list as r, i (r.recipeId)}
								{@const rec = recipes.get(r.recipeId)}
								<span style:--i={i}>
									<GlassIcon glass={rec?.glass} size={56} color={colorOf(rec)} fizz={fizzy(rec)} />
								</span>
							{/each}
						</div>
						<span class="eyebrow">Order {number(order)} is made</span>
						<h2>{roundsText(order)}</h2>
						<p class="muted">Mark it done and the waiter is told it is ready to pick up.</p>
						<button class="btn primary done" disabled={busy} onclick={markReady}>
							Mark order {number(order)} done <kbd>Space</kbd>
						</button>
					</div>
				{/if}
				<button
					class="btn small quiet undo"
					disabled={!done.length || busy}
					onclick={undo}
				>
					Undo <kbd>⌫</kbd>
				</button>
			</section>

			<!-- How to make it. -->
			<section class="card spec" aria-label="Recipe">
				{#if current && recipe}
					<h2>{recipe.name}</h2>
					<table>
						<thead>
							<tr>
								<th scope="col">Ingredient</th>
								<th scope="col">One</th>
								{#if current.qty > 1}<th scope="col">All {current.qty}</th>{/if}
							</tr>
						</thead>
						<tbody>
							{#each recipe.ingredients as i (i.id)}
								{@const [main, other] = measures(i.amount)}
								{@const total = scaled(i.amount, current.qty)}
								<tr class:optional={i.optional}>
									<td>{bar.names.get(i.id) ?? i.id}{i.optional ? ' (optional)' : ''}</td>
									<td>
										{main}
										{#if other}<small>{other}</small>{/if}
									</td>
									{#if current.qty > 1}
										<td class="total">
											{#if total}
												{total[0]} <small>{total[1]}</small>
											{:else}
												{main} × {current.qty}
											{/if}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
					<div>
						<span class="eyebrow">Method</span>
						<p>{recipe.method}</p>
					</div>
					{#if recipe.garnish}
						<div>
							<span class="eyebrow">Garnish</span>
							<p>{recipe.garnish}</p>
						</div>
					{/if}
				{:else if current}
					<h2>{current.name}</h2>
					<p class="muted">This recipe is no longer in the library. Make it from memory.</p>
				{:else}
					<h2>All made</h2>
					<p class="muted">Check the tray against the order, then mark it done.</p>
				{/if}
			</section>
		</div>
	{:else}
		<div class="idle empty">
			<DrinkIllustration glass="Coupe" color="#E2B988" garnish="" size={140} />
			<p>All caught up. Polish a glass.</p>
			{#if lastReady}
				<button class="btn small quiet" disabled={busy} onclick={undo}>
					Bring back order {number(lastReady)} <kbd>⌫</kbd>
				</button>
			{/if}
		</div>
	{/if}

	<section>
		<div class="section-head">
			<h2>Up next</h2>
			<span class="muted">
				{#if readyCount}{readyCount} waiting for the waiter{/if}
			</span>
		</div>
		{#if upNext.length}
			<ol class="next">
				{#each upNext as o, i (o.id)}
					<li
						class="card"
						animate:flip={{ duration: calm(300) }}
						in:fly={{ x: 40, duration: calm(350) }}
						out:fade={{ duration: calm(150) }}
					>
						<div class="spread">
							<b>Order {number(o)}</b>
							<span class="eyebrow">{i === 0 ? 'Next' : waited(o)}</span>
						</div>
						<ul>
							{#each rounds(o) as r (r.recipeId)}
								{@const rec = recipes.get(r.recipeId)}
								<li>
									<GlassIcon glass={rec?.glass} size={22} color={colorOf(rec)} fizz={fizzy(rec)} />
									<span class="qty">{r.qty}×</span>
									{r.name}
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="empty">Nothing else in the queue.</p>
		{/if}
	</section>
{/if}

<style>
	.keys {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sep {
		width: 12px;
	}
	kbd {
		font: inherit;
		font-size: 11px;
		letter-spacing: 0.08em;
		padding: 3px 6px 1px;
		border: 1px solid currentColor;
		border-radius: 4px;
		opacity: 0.8;
	}
	.stage {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) minmax(0, 1.4fr) minmax(260px, 1.1fr);
		gap: 24px;
		align-items: start;
	}
	@media (max-width: 1000px) {
		.stage {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.centre {
			grid-column: 1 / -1;
			grid-row: 1;
		}
	}
	@media (max-width: 640px) {
		.stage {
			grid-template-columns: minmax(0, 1fr);
		}
		.keys,
		.centre kbd {
			display: none;
		}
	}
	.spread {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
	}
	.rounds,
	.next,
	.next ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rounds li {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
		transition: opacity 250ms;
	}
	.rounds li.done {
		opacity: 0.5;
	}
	.rounds li.done .name {
		text-decoration: line-through;
	}
	.rounds li.now .name {
		color: var(--gilt);
	}
	.rounds li.now .state {
		color: var(--peacock);
	}
	.rounds li.done .state {
		color: var(--available);
	}
	.qty {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--gilt);
	}
	.rounds .qty {
		font-size: 20px;
	}
	.rounds .name {
		font-size: 18px;
	}
	.small {
		font-size: 14px;
	}
	.centre {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 14px;
		min-width: 0;
	}
	.hero {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 6px;
	}
	.make {
		position: absolute;
		top: 4px;
		right: -8px;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 84px;
		height: 84px;
		border-radius: 50%;
		background: var(--gilt);
		color: var(--ink);
		font-family: var(--f-display);
		font-size: 40px;
		line-height: 1;
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.35);
	}
	.make small {
		font-family: var(--f-sans);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin-bottom: -10px;
	}
	.drink-name {
		font-size: clamp(30px, 5vw, 44px);
	}
	.done {
		min-width: min(320px, 100%);
		min-height: 60px;
		font-size: 16px;
	}
	.done kbd {
		border-color: var(--ink);
	}
	.batch {
		color: var(--peacock);
		max-width: 34ch;
	}
	.undo {
		margin-top: -4px;
	}
	.confirm {
		display: grid;
		justify-items: center;
		gap: 10px;
		padding: 28px 20px;
		border: 1px solid var(--gilt);
		background: rgb(226 185 136 / 0.08);
		width: 100%;
	}
	.confirm h2 {
		font-size: clamp(26px, 4vw, 34px);
	}
	.glasses {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		margin-bottom: 8px;
	}
	.glasses span {
		animation: clink 600ms calc(var(--i) * 90ms) cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
	}
	@keyframes clink {
		from {
			opacity: 0;
			transform: translateY(16px) rotate(-8deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.glasses span {
			animation: none;
		}
	}
	.spec table {
		width: 100%;
		border-collapse: collapse;
		font-size: 16px;
	}
	.spec th {
		text-align: left;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 600;
		padding-bottom: 6px;
	}
	.spec td {
		padding: 8px 8px 8px 0;
		border-top: 1px solid var(--line);
		vertical-align: top;
	}
	.spec td small {
		display: block;
		color: var(--muted);
		font-size: 13px;
	}
	.spec .total {
		color: var(--gilt);
		font-weight: 600;
	}
	.spec .optional {
		color: var(--muted);
	}
	.spec p {
		margin-top: 4px;
	}
	.idle {
		display: grid;
		justify-items: center;
		gap: 12px;
	}
	.next {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}
	.next ul li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
	}
</style>
