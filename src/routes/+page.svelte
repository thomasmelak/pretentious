<script lang="ts">
	import { api } from '#lib/api.ts';
	import lockup from '#lib/assets/lockup-stacked.svg';
	import { eventDate, money } from '#lib/format.ts';
	import type { PublicMenu } from '#lib/shared/types.ts';

	let menu = $state<PublicMenu | null>(null);
	let failed = $state(false);

	async function load() {
		try {
			menu = await api.menu();
			failed = false;
		} catch {
			failed = true;
		}
	}

	// The menu follows the bar: when an ingredient runs out, its drinks leave within seconds.
	$effect(() => {
		load();
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') load();
		}, 10_000);
		const onVisible = () => document.visibilityState === 'visible' && load();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<svelte:head>
	<title>{menu?.event ? `${menu.event.name} · ` : ''}The Pretentious Peacock</title>
</svelte:head>

<main class="wrap menu">
	<img class="lockup" src={lockup} alt="The Pretentious Peacock cocktail bar" />

	{#if menu?.event}
		<header>
			<p class="eyebrow">
				{menu.event.date ? eventDate(menu.event.date) : "Tonight's menu"}
			</p>
			<h1>{menu.event.name}</h1>
		</header>

		{#if menu.items.length}
			<ul>
				{#each menu.items as item (item.id)}
					<li>
						<p class="eyebrow">{item.style}</p>
						<div class="spread">
							<h2>{item.name}</h2>
							<span class="price">{money(item.price, menu.currency)}</span>
						</div>
						<p class="note">{item.note}</p>
						<p class="muted">{item.ingredients.join(' · ')}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="note center">
				The bar is between bottles. Give us a moment, perfection is being restocked.
			</p>
		{/if}
	{:else if menu}
		<p class="note center">No event is being poured right now. The peacock is resting.</p>
	{:else if failed}
		<p class="note center">The menu is taking a moment to arrive. It will appear here shortly.</p>
	{/if}

	<footer>
		<a href="#/bar" class="eyebrow">Behind the bar</a>
	</footer>
</main>

<style>
	.menu {
		max-width: 680px;
		padding-block: 32px 48px;
	}
	.lockup {
		display: block;
		width: min(100%, 300px);
		height: auto;
		margin: 0 auto 8px;
	}
	header {
		text-align: center;
		padding-bottom: 28px;
		border-bottom: 1px solid var(--line);
	}
	header h1 {
		margin-top: 8px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		padding: 24px 0;
		border-bottom: 1px solid var(--line);
		display: grid;
		gap: 6px;
	}
	li h2 {
		font-size: 30px;
	}
	li .price {
		font-size: 20px;
	}
	.center {
		text-align: center;
		padding: 40px 0;
	}
	footer {
		text-align: center;
		margin-top: 40px;
	}
	footer a {
		text-decoration: none;
		opacity: 0.7;
	}
</style>
