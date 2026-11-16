<script lang="ts">
	import qrcode from 'qrcode-generator';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import Count from '#lib/components/Count.svelte';
	import { eventDate, money, newId } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { menuRows, totals } from '#lib/shared/logic.ts';
	import type { BarEvent } from '#lib/shared/types.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	let name = $state('');
	let date = $state('');
	let currency = $state(bar.core.currency);

	const guestUrl = `${location.origin}${location.pathname}#/`;
	const qr = $derived.by(() => {
		const code = qrcode(0, 'M');
		code.addData(guestUrl);
		code.make();
		return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
	});

	const cards = $derived(
		bar.core.events.map((event) => {
			const rows = menuRows(bar.core, event);
			return {
				event,
				drinks: rows.length,
				available: rows.filter((r) => r.available).length,
				takings: totals(bar.orders.filter((o) => o.eventId === event.id))
			};
		})
	);

	async function create(e: SubmitEvent) {
		e.preventDefault();
		const first = bar.core.events.length === 0;
		const ok = await bar.dispatch({ type: 'event.create', id: newId(), name, date });
		if (ok) {
			toasts.push(
				first ? `${name.trim()} created, and live. Now give it a menu.` : `${name.trim()} created.`,
				'ok'
			);
			name = date = '';
		}
	}

	function goLive(event: BarEvent) {
		bar.dispatch({ type: 'event.activate', id: event.id });
		toasts.push(`${event.name} is live. Guests now see its menu.`, 'ok');
	}

	function end(event: BarEvent) {
		bar.dispatch({ type: 'event.activate', id: null });
		toasts.push(`${event.name} has ended. The guest menu is resting.`);
	}
</script>

<div class="page-head">
	<div>
		<h1>Events</h1>
		<p class="muted">
			Every event has its own menu and prices. Guests see the menu of the event that is live.
		</p>
	</div>
</div>

<form class="card new" onsubmit={create}>
	<label>Event name <input bind:value={name} required maxlength="80" placeholder="Gallery opening" /></label>
	<label>Date <input type="date" bind:value={date} /></label>
	<button class="btn primary">Create event</button>
</form>

<section>
	{#if cards.length}
		<div class="grid">
			{#each cards as c (c.event.id)}
				{@const live = bar.core.activeEventId === c.event.id}
				<article
					class="card"
					class:live
					animate:flip={{ duration: calm(350) }}
					in:scale={{ start: 0.92, duration: calm(350) }}
					out:scale={{ start: 0.92, duration: calm(200) }}
				>
					<div class="spread">
						<p class="eyebrow">{c.event.date ? eventDate(c.event.date) : 'No date set'}</p>
						{#if live}<span class="badge pick">Live</span>{/if}
					</div>
					<h2>{c.event.name}</h2>
					<p class="muted">
						{c.drinks} on the menu · {c.available} available now
					</p>
					<dl>
						<div><dt>Cash</dt><dd><Count value={c.takings.cash} currency={bar.core.currency} /></dd></div>
						<div>
							<dt>Digital</dt>
							<dd><Count value={c.takings.digital} currency={bar.core.currency} /></dd>
						</div>
						<div><dt>Total</dt><dd><Count value={c.takings.total} currency={bar.core.currency} /></dd></div>
					</dl>
					<div class="row actions">
						<a class="btn small primary" href={`#/bar/events/${c.event.id}`}>Edit menu</a>
						{#if !live}
							<button class="btn small" onclick={() => goLive(c.event)}>Go live</button>
						{:else}
							<button class="btn small quiet" onclick={() => end(c.event)}>End</button>
						{/if}
						<button
							class="btn small quiet"
							onclick={() =>
								confirm(`Delete ${c.event.name} and its orders? This cannot be undone.`) &&
								bar.dispatch({ type: 'event.delete', id: c.event.id })}
						>
							Delete
						</button>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<p class="empty">No events yet. Create the first one above.</p>
	{/if}
</section>

<section class="settings">
	<div class="card">
		<h2>Guest menu</h2>
		<p class="muted">Print this or prop it on the bar. It always shows the live event.</p>
		<div class="qr" aria-label="QR code for the guest menu">{@html qr}</div>
		<a href={guestUrl}>{guestUrl}</a>
	</div>
	<form
		class="card"
		onsubmit={(e) => {
			e.preventDefault();
			bar.dispatch({ type: 'currency.set', currency });
		}}
	>
		<h2>Currency</h2>
		<label>
			Three-letter code
			<input bind:value={currency} maxlength="3" required placeholder="USD" />
		</label>
		<p class="muted">Prices look like {money(12.5, bar.core.currency)}.</p>
		<div><button class="btn">Save</button></div>
	</form>
</section>

<style>
	.new {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		align-items: end;
		gap: 12px;
	}
	.live {
		border-color: var(--peacock);
		box-shadow: 0 0 0 1px var(--peacock);
	}
	article.card:hover {
		transform: translateY(-3px);
	}
	dl {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin: 4px 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	dl div {
		padding: 10px 0;
	}
	dt {
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}
	dd {
		margin: 0;
		color: var(--gilt);
		font-variant-numeric: tabular-nums;
		font-size: 19px;
	}
	.actions {
		margin-top: auto;
	}
	.settings {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}
	.qr {
		width: 180px;
		background: var(--vellum);
		padding: 6px;
	}
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	.settings a {
		overflow-wrap: anywhere;
	}
</style>
