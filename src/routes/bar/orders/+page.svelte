<script lang="ts">
	import { bar } from '#lib/bar.svelte.ts';
	import { clock, money } from '#lib/format.ts';
	import { menuRows, totals } from '#lib/shared/logic.ts';
	import type { Payment } from '#lib/shared/types.ts';

	const event = $derived(bar.active);
	const rows = $derived(event ? menuRows(bar.core, event) : []);
	const orders = $derived(event ? bar.orders.filter((o) => o.eventId === event.id) : []);
	const sums = $derived(totals(orders));
	const cur = $derived(bar.core.currency);

	let ticket = $state<Record<string, number>>({});
	let sending = $state(false);

	const lines = $derived(
		rows
			.filter((row) => ticket[row.recipe.id] > 0)
			.map((row) => ({ row, qty: ticket[row.recipe.id] }))
	);
	const due = $derived(
		lines.reduce((sum, l) => sum + Math.round(l.row.price * 100) * l.qty, 0) / 100
	);

	function bump(id: string, by: number) {
		ticket[id] = Math.max(0, (ticket[id] ?? 0) + by);
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
		if (ok) ticket = {};
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
		<div class="stat"><span class="eyebrow">Cash</span><b>{money(sums.cash, cur)}</b></div>
		<div class="stat"><span class="eyebrow">Digital</span><b>{money(sums.digital, cur)}</b></div>
		<div class="stat"><span class="eyebrow">Total</span><b>{money(sums.total, cur)}</b></div>
		<div class="stat"><span class="eyebrow">Drinks</span><b>{sums.drinks}</b></div>
	</div>

	<div class="till">
		<section>
			<div class="section-head"><h2>Menu</h2></div>
			{#if rows.length}
				<div class="tiles">
					{#each rows as row (row.recipe.id)}
						<button
							class="tile"
							disabled={!row.available}
							onclick={() => bump(row.recipe.id, 1)}
							aria-label={row.available
								? `Add ${row.recipe.name}`
								: `${row.recipe.name} is unavailable`}
						>
							<span class="name">{row.recipe.name}</span>
							{#if row.available}
								<span class="price">{money(row.price, cur)}</span>
							{:else}
								<span class="badge out">86'd</span>
							{/if}
							{#if ticket[row.recipe.id] > 0}
								<span class="count">{ticket[row.recipe.id]}</span>
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
						<li>
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
					<b class="price">{money(due, cur)}</b>
				</div>
				<div class="pay">
					<button class="btn primary" disabled={sending} onclick={() => pay('cash')}>
						Paid cash
					</button>
					<button class="btn primary" disabled={sending} onclick={() => pay('digital')}>
						Paid digital
					</button>
				</div>
				<button class="btn small quiet" onclick={() => (ticket = {})}>Clear</button>
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
					<li class:voided={o.voided}>
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
		border-color: var(--gilt);
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
