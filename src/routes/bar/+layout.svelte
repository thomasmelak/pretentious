<script lang="ts">
	import { page } from '$app/state';
	import head from '#lib/assets/head.svg';
	import { bar } from '#lib/bar.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '#/bar/inventory', id: '/bar/inventory', label: 'Inventory' },
		{ href: '#/bar/recipes', id: '/bar/recipes', label: 'Recipes' },
		{ href: '#/bar/events', id: '/bar/events', label: 'Events' },
		{ href: '#/bar/orders', id: '/bar/orders', label: 'Orders' }
	];

	let pin = $state('');
	let signingIn = $state(false);
	let signInError = $state('');

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
				<span>The Pretentious Peacock</span>
			</a>
			<nav aria-label="Bar">
				{#each tabs as tab (tab.id)}
					<a
						href={tab.href}
						aria-current={page.route.id?.startsWith(tab.id) ? 'page' : undefined}>{tab.label}</a
					>
				{/each}
			</nav>
		</div>
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
		<form onsubmit={signIn}>
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
				<p id="gate-error" class="error" role="alert">{signInError || bar.error}</p>
			{/if}
			<button class="btn primary" disabled={signingIn}>
				{signingIn ? 'Checking' : 'Sign in'}
			</button>
		</form>
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
		font-family: var(--f-display);
		font-size: 21px;
		letter-spacing: 0.04em;
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
	.gate a {
		text-decoration: none;
	}
</style>
