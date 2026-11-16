<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import { clock, money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { menuRows, profileOf, totals } from '#lib/shared/logic.ts';
	import type { Payment } from '#lib/shared/types.ts';
	import { clearTicket, ticket } from '#lib/stores/ticket.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	const event = $derived(bar.active);
	const rows = $derived(event ? menuRows(bar.core, event) : []);
	const orders = $derived(event ? bar.orders.filter((o) => o.eventId === event.id) : []);
	const sums = $derived(totals(orders));
	const cur = $derived(bar.core.currency);

	// The order in progress lives in a store, so it survives a trip to another screen.
	const t = $derived<Record<string, number>>(
		event && $ticket.eventId === event.id ? $ticket.lines : {}
	);
	let sending = $state(false);
	let rung = $state('');

	const lines = $derived(
		rows
			.filter((row) => t[row.recipe.id] > 0)
			.map((row) => ({ row, qty: t[row.recipe.id] }))
	);
	const due = $derived(
		lines.reduce((sum, l) => sum + Math.round(l.row.price * 100) * l.qty, 0) / 100
	);

	function bump(id: string, by: number) {
		if (!event) return;
		const lines = { ...t };
		const next = Math.max(0, (lines[id] ?? 0) + by);
		if (next) lines[id] = next;
		else delete lines[id];
		ticket.set({ eventId: event.id, lines });
		if (by > 0) {
			rung = '';
			requestAnimationFrame(() => (rung = id));
		}
	}

	async function pay(payment: Payment) {
		if (!event || lines.length === 0) return;
		sending = true;
		const ok = await bar.placeOrder({
			eventId: event.id,
			payment,
			lines: lines.map((l) => ({ recipeId: l.row.recipe.id, qty: l.qty }))
		});
		sending = false;
		if (ok) {
			toasts.push(`${money(due, cur)} paid ${payment === 'cash' ? 'in cash' : 'digitally'}. Cheers.`, 'ok');
			clearTicket();
		}
	}
</script>

<div class="page-head">
	<div>
		<h1>Orders</h1>
		<p class="muted">
			{#if event}
				Taking orders for <b>{event.name}</b>.
			{:else}
				No event is live. <a href="#/bar/events">Choose one</a> to start taking orders.
			{/if}
		</p>
	</div>
</div>

{#if event}
	<div class="stats" aria-label="Takings">
		<div class="stat"><span class="eyebrow">Cash</span><b><Count value={sums.cash} currency={cur} /></b></div>
		<div class="stat">
			<span class="eyebrow">Digital</span><b><Count value={sums.digital} currency={cur} /></b>
		</div>
		<div class="stat"><span class="eyebrow">Total</span><b><Count value={sums.total} currency={cur} /></b></div>
		<div class="stat"><span class="eyebrow">Drinks</span><b><Count value={sums.drinks} /></b></div>
	</div>

	<div class="till">
		<section>
			<div class="section-head"><h2>Menu</h2></div>
			{#if rows.length}
				<div class="tiles">
					{#each rows as row (row.recipe.id)}
						<button
							class="tile"
							class:rung={rung === row.recipe.id}
							style:--drink={row.recipe.color ?? 'var(--gilt)'}
							disabled={!row.available}
							onclick={() => bump(row.recipe.id, 1)}
							aria-label={row.available
								? `Add ${row.recipe.name}`
								: `${row.recipe.name} is unavailable`}
						>
							<GlassIcon
								glass={row.recipe.glass}
								size={30}
								color={row.available ? row.recipe.color : undefined}
								fizz={profileOf(row.recipe) === 'long'}
							/>
							<span class="name">{row.recipe.name}</span>
							{#if row.available}
								<span class="price">{money(row.price, cur)}</span>
							{:else}
								<span class="badge out">86'd</span>
							{/if}
							{#if t[row.recipe.id] > 0}
								{#key t[row.recipe.id]}
									<span class="count" in:fly={{ y: -8, duration: calm(200) }}>{t[row.recipe.id]}</span>
								{/key}
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<p class="empty">
					This event has no drinks yet.
					<a href={`#/bar/events/${event.id}`}>Build its menu</a>
				</p>
			{/if}
		</section>

		<section class="card ticket" aria-label="Current order">
			<h2>Current order</h2>
			{#if lines.length}
				<ul>
					{#each lines as l (l.row.recipe.id)}
						<li
							animate:flip={{ duration: calm(250) }}
							in:slide={{ duration: calm(250) }}
							out:fade={{ duration: calm(150) }}
						>
							<span class="name">{l.row.recipe.name}</span>
							<span class="qty">
								<button
									class="btn small quiet"
									aria-label={`One fewer ${l.row.recipe.name}`}
									onclick={() => bump(l.row.recipe.id, -1)}>−</button
								>
								<b>{l.qty}</b>
								<button
									class="btn small quiet"
									aria-label={`One more ${l.row.recipe.name}`}
									onclick={() => bump(l.row.recipe.id, 1)}>+</button
								>
							</span>
							<span class="price">{money(l.row.price * l.qty, cur)}</span>
						</li>
					{/each}
				</ul>
				<div class="spread due">
					<span class="eyebrow">Due</span>
					<b class="price"><Count value={due} currency={cur} /></b>
				</div>
				<div class="pay">
					<button class="btn primary" disabled={sending} onclick={() => pay('cash')}>
						Paid cash
					</button>
					<button class="btn primary" disabled={sending} onclick={() => pay('digital')}>
						Paid digital
					</button>
				</div>
				<button class="btn small quiet" onclick={clearTicket}>Clear</button>
			{:else}
				<p class="muted">Tap drinks to start an order.</p>
			{/if}
		</section>
	</div>

	<section>
		<div class="section-head">
			<h2>History</h2>
			<span class="muted">{sums.orders} orders</span>
		</div>
		{#if orders.length}
			<ul class="history">
				{#each orders as o (o.id)}
					<li
						class:voided={o.voided}
						animate:flip={{ duration: calm(300) }}
						in:fly={{ y: -16, duration: calm(400) }}
					>
						<span class="muted time">{clock(o.at)}</span>
						<span class="items">
							{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}
						</span>
						<span class="eyebrow pay-kind">{o.voided ? 'Voided' : o.payment}</span>
						<span class="price">{money(o.total, cur)}</span>
						<button class="btn small quiet" onclick={() => bar.setVoided(o, !o.voided)}>
							{o.voided ? 'Restore' : 'Void'}
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No orders yet tonight.</p>
		{/if}
	</section>
{/if}

<style>
	.till {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
		gap: 24px;
		margin-top: 28px;
		align-items: start;
	}
	.till section {
		margin-top: 0;
	}
	.till + section {
		margin-top: 36px;
	}
	@media (max-width: 760px) {
		.till {
			grid-template-columns: 1fr;
		}
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}
	.tile {
		position: relative;
		font: inherit;
		text-align: left;
		color: var(--vellum);
		background: var(--olive-raised);
		border: 1px solid var(--line);
		padding: 14px;
		min-height: 92px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 8px;
		cursor: pointer;
	}
	.tile:hover:not(:disabled) {
		border-color: var(--drink, var(--gilt));
		transform: translateY(-2px);
	}
	.tile {
		transition:
			border-color 200ms,
			transform 150ms;
		border-left: 3px solid var(--drink, var(--line));
	}
	.tile:disabled {
		border-left-color: var(--line);
	}
	.tile:active:not(:disabled) {
		transform: scale(0.96);
	}
	.tile.rung {
		animation: pop 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.tile.rung {
			animation: none;
		}
	}
	.tile:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.tile .name {
		font-family: var(--f-display);
		font-size: 21px;
		line-height: 1.15;
		color: var(--gilt);
	}
	.count {
		position: absolute;
		top: 8px;
		right: 8px;
		min-width: 26px;
		height: 26px;
		padding: 2px 6px 0;
		border-radius: 13px;
		background: var(--gilt);
		color: var(--ink);
		font-weight: 600;
		text-align: center;
	}
	.ticket {
		position: sticky;
		top: 84px;
	}
	.ticket ul,
	.history {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ticket li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 4px 12px;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
	}
	.ticket li .name {
		grid-column: 1 / -1;
	}
	.qty {
		display: inline-flex;
		align-items: center;
		gap: 12px;
	}
	.qty .btn {
		min-width: 40px;
		font-size: 18px;
	}
	.due b {
		font-family: var(--f-display);
		font-size: 30px;
		font-weight: 400;
	}
	.pay {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.history li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		gap: 4px 14px;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
	}
	.history .voided .items,
	.history .voided .price {
		text-decoration: line-through;
		color: var(--muted);
	}
	@media (max-width: 600px) {
		.history li {
			grid-template-columns: auto minmax(0, 1fr) auto;
		}
		.history .items {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
