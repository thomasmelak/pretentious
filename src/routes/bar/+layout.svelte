<script lang="ts">
	import { page } from '$app/state';
	import head from '#lib/assets/head.svg';
	import { slide } from 'svelte/transition';
	import { bar } from '#lib/bar.svelte.ts';
	import { calm } from '#lib/motion.ts';
	import { ticket } from '#lib/stores/ticket.ts';
	import { wizard } from '#lib/stores/wizard.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '#/bar/inventory', id: '/bar/inventory', label: 'Inventory' },
		{ href: '#/bar/recipes', id: '/bar/recipes', label: 'Recipes' },
		{ href: '#/bar/events', id: '/bar/events', label: 'Events' },
		{ href: '#/bar/orders', id: '/bar/orders', label: 'Orders' }
	];

	const here = $derived(page.route.id ?? '');
	const draftName = $derived($wizard.draft.name.trim() || 'Untitled recipe');
	const openDrinks = $derived(
		$ticket.eventId && $ticket.eventId === bar.core.activeEventId
			? Object.values($ticket.lines).reduce((n, q) => n + q, 0)
			: 0
	);
	const badge = (id: string) =>
		id === '/bar/recipes' && $wizard.open ? '•' : id === '/bar/orders' && openDrinks ? String(openDrinks) : '';

	let pin = $state('');
	let signingIn = $state(false);
	let signInError = $state('');
	let refusals = $state(0);

	$effect(() => {
		bar.start();
	});

	async function signIn(event: SubmitEvent) {
		event.preventDefault();
		signingIn = true;
		signInError = '';
		try {
			await bar.signIn(pin);
			pin = '';
		} catch (err) {
			signInError = err instanceof Error ? err.message : 'Something went wrong.';
			refusals++;
		} finally {
			signingIn = false;
		}
	}
</script>

<svelte:head>
	<title>Behind the bar · The Pretentious Peacock</title>
</svelte:head>

{#if bar.status === 'ready'}
	<header class="top">
		<div class="wrap bar">
			<a class="brand" href="#/" aria-label="Guest menu">
				<img src={head} alt="" width="40" height="40" />
				<span class="eyebrow">Behind the bar</span>
			</a>
			<nav aria-label="Bar">
				{#each tabs as tab (tab.id)}
					<a href={tab.href} aria-current={here.startsWith(tab.id) ? 'page' : undefined}>
						{tab.label}
						{#if badge(tab.id)}
							<span class="dot" aria-label={tab.id === '/bar/orders' ? 'order in progress' : 'recipe in progress'}
								>{badge(tab.id)}</span
							>
						{/if}
					</a>
				{/each}
			</nav>
		</div>
		{#if ($wizard.open && !here.startsWith('/bar/recipes')) || (openDrinks && !here.startsWith('/bar/orders'))}
			<div class="resume" transition:slide={{ duration: calm(250) }}>
				<div class="wrap row">
					<span class="eyebrow">Waiting for you</span>
					{#if $wizard.open && !here.startsWith('/bar/recipes')}
						<a href="#/bar/recipes">Recipe: {draftName} →</a>
					{/if}
					{#if openDrinks && !here.startsWith('/bar/orders')}
						<a href="#/bar/orders">Order: {openDrinks} {openDrinks === 1 ? 'drink' : 'drinks'} →</a>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<main class="wrap body">
		{#if bar.error}
			<p class="alert" role="alert">
				{bar.error}
				<button class="btn small quiet" onclick={() => (bar.error = '')}>Dismiss</button>
			</p>
		{/if}
		{@render children()}
	</main>

	<footer class="wrap foot">
		<a href="#/" class="eyebrow">Guest menu</a>
		<button class="btn small quiet" onclick={() => bar.signOut()}>Sign out</button>
	</footer>
{:else if bar.status === 'signed-out'}
	<main class="wrap gate">
		<img src={head} alt="" width="96" height="96" />
		<h1>Behind the bar</h1>
		<p class="note">Staff only. Guests, your menu is the other way.</p>
		{#key refusals}
		<form onsubmit={signIn} class:refused={refusals > 0}>
			<label>
				Bar passphrase
				<input
					type="password"
					bind:value={pin}
					autocomplete="current-password"
					required
					aria-describedby={signInError || bar.error ? 'gate-error' : undefined}
				/>
			</label>
			{#if signInError || bar.error}
				<p id="gate-error" class="error" role="alert">
					{signInError === 'Wrong passphrase.'
						? 'Wrong passphrase. The peacock is unimpressed.'
						: signInError || bar.error}
				</p>
			{/if}
			<button class="btn primary" disabled={signingIn}>
				{signingIn ? 'Checking' : 'Sign in'}
			</button>
		</form>
		{/key}
		<a href="#/" class="eyebrow">Back to the menu</a>
	</main>
{/if}

<style>
	.top {
		background: var(--olive-deep);
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		z-index: 5;
		view-transition-name: bar-header;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0 24px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
		text-decoration: none;
	}
	.brand img {
		transition: transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.brand:hover img {
		transform: rotate(-10deg) scale(1.08);
	}
	nav {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		margin-inline: -6px;
	}
	nav a {
		padding: 16px 10px 12px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--muted);
		border-bottom: 2px solid transparent;
		white-space: nowrap;
	}
	.dot {
		display: inline-grid;
		place-items: center;
		min-width: 18px;
		height: 18px;
		padding: 2px 5px 0;
		margin-left: 4px;
		border-radius: 9px;
		background: var(--gilt);
		color: var(--ink);
		font-size: 11px;
		letter-spacing: 0;
		vertical-align: 1px;
	}
	.resume {
		border-top: 1px solid var(--line);
		background: rgb(226 185 136 / 0.1);
	}
	.resume .row {
		padding-block: 8px 6px;
		gap: 6px 20px;
	}
	.resume a {
		text-decoration: none;
	}
	.resume a:hover {
		text-decoration: underline;
	}
	nav a[aria-current='page'] {
		color: var(--gilt);
		border-bottom-color: var(--gilt);
	}
	.body {
		padding-bottom: 48px;
		min-height: 70dvh;
	}
	.alert {
		margin-top: 16px;
		padding: 12px 16px;
		border: 1px solid var(--out);
		color: var(--out);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-block: 20px 32px;
		border-top: 1px solid var(--line);
	}
	.foot a {
		text-decoration: none;
	}
	.gate {
		max-width: 400px;
		min-height: 100dvh;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 14px;
		text-align: center;
	}
	.gate form {
		display: grid;
		gap: 14px;
		width: 100%;
		margin: 12px 0;
		text-align: left;
	}
	.error {
		color: var(--out);
	}
	.refused {
		animation: shake 400ms ease-in-out;
	}
	.gate img {
		animation: arrive 900ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(-16px) rotate(-12deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.refused,
		.gate img {
			animation: none;
		}
	}
	.gate a {
		text-decoration: none;
	}
</style>
