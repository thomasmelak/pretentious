<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { api } from '#lib/api.ts';
	import GlassIcon from '#lib/components/GlassIcon.svelte';
	import Peacock from '#lib/components/Peacock.svelte';
	import ProfileIcon from '#lib/components/ProfileIcon.svelte';
	import { eventDate, money } from '#lib/format.ts';
	import { calm } from '#lib/motion.ts';
	import { FAMILIES, NO_FAMILY, PROFILES } from '#lib/shared/catalog.ts';
	import { listNames, menuChanges } from '#lib/shared/logic.ts';
	import { measures } from '#lib/shared/measure.ts';
	import type { Profile, PublicMenu } from '#lib/shared/types.ts';
	import { toasts } from '#lib/toast.svelte.ts';

	type Item = PublicMenu['items'][number];

	const ROUND_KEY = 'pp-round';
	const OPINIONS = [
		'Yes, I know. Stunning.',
		'The fan is for admiring, not for touching.',
		'I have opinions about your order. They are correct.',
		'Every feather, measured to the quarter-ounce.',
		'You may approach the bar.',
		'Shaken or stirred is not a preference. It is a philosophy.',
		'Do take your time. I certainly do.'
	];

	let menu = $state<PublicMenu | null>(null);
	let failed = $state(false);

	let peacock = $state<ReturnType<typeof Peacock>>();
	let opinion = $state('');
	let opinionTimer: ReturnType<typeof setTimeout> | undefined;
	let lastOpinion = -1;

	// Like the website's "Find your drink": a spirit and a mood.
	let spiritPick = $state<string>('all');
	let moodPick = $state<Profile | 'all'>('all');
	const PROFILE_BY_ID = new Map(PROFILES.map((p) => [p.id, p]));
	const SPIRIT_GROUPS = [...FAMILIES, { id: 'none', label: NO_FAMILY }];
	const spiritKey = (item: Item) => item.spirit ?? 'none';
	let open = $state<string | null>(null);
	let spotlight = $state<string | null>(null);
	let choosing = $state(false);

	let round = $state<Record<string, number>>({});
	let roundDialog = $state<HTMLDialogElement>();

	const items = $derived(menu?.items ?? []);
	const currency = $derived(menu?.currency ?? 'USD');
	const openBar = $derived(Boolean(menu?.event?.openBar));
	const spirits = $derived(SPIRIT_GROUPS.filter((g) => items.some((i) => spiritKey(i) === g.id)));
	const moods = $derived(PROFILES.filter((p) => items.some((i) => i.profile === p.id)));
	const shown = $derived(
		items.filter(
			(i) =>
				(spiritPick === 'all' || spiritKey(i) === spiritPick) &&
				(moodPick === 'all' || i.profile === moodPick)
		)
	);
	const groups = $derived(
		SPIRIT_GROUPS.map((g) => ({ ...g, items: shown.filter((i) => spiritKey(i) === g.id) })).filter(
			(g) => g.items.length
		)
	);
	const roundLines = $derived(
		items.filter((i) => round[i.id] > 0).map((item) => ({ item, qty: round[item.id] }))
	);
	const roundCount = $derived(roundLines.reduce((n, l) => n + l.qty, 0));
	const roundTotal = $derived(
		roundLines.reduce((sum, l) => sum + Math.round(l.item.price * 100) * l.qty, 0) / 100
	);

	async function load() {
		let next: PublicMenu;
		try {
			next = await api.menu();
			failed = false;
		} catch {
			failed = true;
			return;
		}
		const previous = menu;
		menu = next;
		if (!previous) {
			restoreRound(next);
		} else if (previous.event?.name === next.event?.name) {
			announce(menuChanges(previous, next));
		}
		// A drink that has run out cannot stay in anyone's round.
		for (const id of Object.keys(round)) {
			if (!next.items.some((i) => i.id === id)) delete round[id];
		}
	}

	function announce({ gone, back }: { gone: string[]; back: string[] }) {
		if (gone.length) {
			toasts.push(
				`The ${listNames(gone)} ${gone.length > 1 ? 'have' : 'has'} just left the menu. Our condolences.`,
				'out',
				6000
			);
		}
		if (back.length) {
			toasts.push(`The ${listNames(back)} ${back.length > 1 ? 'are' : 'is'} back. Order is restored.`, 'ok', 6000);
		}
	}

	// The menu follows the bar: when an ingredient runs out, its drinks leave within seconds.
	$effect(() => {
		load();
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') load();
		}, 15_000);
		const onVisible = () => document.visibilityState === 'visible' && load();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	// A guest's round is only kept on their own phone, for the event they started it at.
	function restoreRound(first: PublicMenu) {
		try {
			const saved = JSON.parse(localStorage.getItem(ROUND_KEY) ?? 'null');
			if (saved?.event === first.event?.name && saved.round) round = saved.round;
		} catch {
			// Nothing saved, or storage is unavailable.
		}
	}
	$effect(() => {
		if (!menu) return;
		const saved = JSON.stringify({ event: menu.event?.name, round: $state.snapshot(round) });
		try {
			localStorage.setItem(ROUND_KEY, saved);
		} catch {
			// Private windows may refuse. The round still works until the page closes.
		}
	});

	// Lift the toasts clear of the round tray.
	$effect(() => {
		document.body.style.setProperty('--tray', roundCount ? '76px' : '0px');
		return () => document.body.style.removeProperty('--tray');
	});

	function bump(id: string, by: number) {
		const next = Math.min(20, Math.max(0, (round[id] ?? 0) + by));
		if (next === 0) delete round[id];
		else round[id] = next;
		if (roundCount === 0) roundDialog?.close();
	}

	function opine() {
		let n = lastOpinion;
		while (n === lastOpinion) n = Math.floor(Math.random() * OPINIONS.length);
		lastOpinion = n;
		say(OPINIONS[n]);
	}

	function say(text: string) {
		opinion = text;
		clearTimeout(opinionTimer);
		opinionTimer = setTimeout(() => (opinion = ''), 5000);
	}

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** Let the peacock pick: run a light along the menu, slow down, and land on one drink. */
	async function choose() {
		if (choosing || shown.length === 0) return;
		const pool = shown;
		const winner = pool[Math.floor(Math.random() * pool.length)];
		choosing = true;
		open = null;
		peacock?.ruffle();
		if (calm(1) && pool.length > 1) {
			const laps = Math.max(8, Math.min(16, pool.length * 2));
			let at = Math.floor(Math.random() * pool.length);
			for (let step = 0; step < laps; step++) {
				at = (at + 1) % pool.length;
				spotlight = pool[at].id;
				await wait(70 + step * step * 1.6);
			}
		}
		spotlight = winner.id;
		open = winner.id;
		choosing = false;
		say(`The peacock has decided: the ${winner.name}. Arguing is permitted, but futile.`);
		document
			.getElementById(`drink-${winner.id}`)
			?.scrollIntoView({ block: 'center', behavior: calm(1) ? 'smooth' : 'auto' });
		await wait(2600);
		if (spotlight === winner.id) spotlight = null;
	}
</script>

<svelte:head>
	<title>{menu?.event ? `${menu.event.name} · ` : ''}The Pretentious Peacock</title>
</svelte:head>

<main class="wrap menu" class:has-round={roundCount > 0}>
	<div class="hero">
		<div class="bird"><Peacock bind:this={peacock} onruffle={opine} /></div>
		<p class="opinion note" aria-live="polite">
			{#key opinion}
				<span in:fade={{ duration: calm(400) }}>{opinion || ' '}</span>
			{/key}
		</p>
	</div>

	{#if menu?.event}
		<header>
			<p class="eyebrow">
				{menu.event.date ? eventDate(menu.event.date) : "Tonight's menu"}
			</p>
			<h1>{menu.event.name}</h1>
			{#if openBar}
				<p class="open-bar">Open bar. Tonight the drinks are on the house.</p>
			{/if}
		</header>

		{#if items.length}
			<div class="tools">
				<fieldset>
					<legend>Pick a spirit</legend>
					<div class="chips" role="group">
						<button type="button" class="chip" aria-pressed={spiritPick === 'all'} onclick={() => (spiritPick = 'all')}>
							Any spirit
						</button>
						{#each spirits as sp (sp.id)}
							<button
								type="button"
								class="chip"
								aria-pressed={spiritPick === sp.id}
								onclick={() => (spiritPick = sp.id)}
							>
								{sp.label}
							</button>
						{/each}
					</div>
				</fieldset>
				<fieldset>
					<legend>Pick a mood</legend>
					<div class="chips" role="group">
						<button type="button" class="chip" aria-pressed={moodPick === 'all'} onclick={() => (moodPick = 'all')}>
							Any mood
						</button>
						{#each moods as m (m.id)}
							<button
								type="button"
								class="chip"
								aria-pressed={moodPick === m.id}
								onclick={() => (moodPick = m.id)}
							>
								<ProfileIcon profile={m.id} size={18} />
								{m.label}
							</button>
						{/each}
					</div>
				</fieldset>
				<button type="button" class="btn decide" onclick={choose} disabled={choosing || !shown.length}>
					{choosing ? 'Deliberating' : 'Let the peacock choose'}
				</button>
			</div>

			{#each groups as group (group.id)}
				<section class="group" in:fade={{ duration: calm(300) }}>
					<h2 class="group-head">
						<span>{group.label}</span>
						<span class="count">{group.items.length}</span>
					</h2>
					<ul class="drinks">
						{#each group.items as item (item.id)}
							{@const qty = round[item.id] ?? 0}
							{@const profile = PROFILE_BY_ID.get(item.profile)}
							<li
								id={`drink-${item.id}`}
								class:open={open === item.id}
								class:lit={spotlight === item.id}
								style:--drink={item.color}
								animate:flip={{ duration: calm(450) }}
								in:fly={{ y: 18, duration: calm(450) }}
								out:fade={{ duration: calm(200) }}
							>
								<div class="top">
									<GlassIcon glass={item.glass} size={48} color={item.color} fizz={item.profile === 'long'} />
									<div class="what">
										<p class="eyebrow">{item.style}</p>
										<h3>
											<button
												type="button"
												class="toggle"
												aria-expanded={open === item.id}
												aria-controls={`more-${item.id}`}
												onclick={() => (open = open === item.id ? null : item.id)}
											>
												{item.name}
											</button>
										</h3>
										{#if profile}
											<p class="profile"><ProfileIcon profile={profile.id} size={18} /> {profile.label}</p>
										{/if}
										<p class="note">{item.note}</p>
									</div>
									<div class="side">
										{#if !openBar}<span class="price">{money(item.price, currency)}</span>{/if}
										<button
											type="button"
											class="add"
											class:has={qty > 0}
											aria-label={`Add a ${item.name} to your round${qty ? `, ${qty} so far` : ''}`}
											onclick={() => bump(item.id, 1)}
										>
											{#key qty}
												<span in:scale={{ start: 0.4, duration: calm(250) }}>{qty || '+'}</span>
											{/key}
										</button>
									</div>
								</div>
								{#if open === item.id}
									<div id={`more-${item.id}`} class="more" transition:slide={{ duration: calm(350) }}>
										<table>
											<caption class="eyebrow">In the glass</caption>
											<tbody>
												{#each item.ingredients as ing (ing.name)}
													{@const [first, second] = measures(ing.amount)}
													<tr>
														<th scope="row">{ing.name}{ing.optional ? ' (optional)' : ''}</th>
														<td>{first}</td>
														<td class="alt">{second ?? ''}</td>
													</tr>
												{/each}
											</tbody>
										</table>
										{#if item.method}
											<p><span class="eyebrow">How we make it</span><br />{item.method}</p>
										{/if}
										{#if item.glass || item.garnish}
											<p>
												<span class="eyebrow">Served</span><br />
												{[item.glass, item.garnish && item.garnish[0].toLowerCase() + item.garnish.slice(1)].filter(Boolean).join(', with ')}
											</p>
										{/if}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<p class="note center">
					Nothing with that spirit in that mood tonight. The peacock suggests broadening your mind.
				</p>
			{/each}
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

{#if roundCount > 0}
	<div class="tray" transition:fly={{ y: 90, duration: calm(350) }}>
		<div class="wrap tray-in">
			<p>
				<span class="eyebrow">Your round</span>
				<b>
					{roundCount}
					{roundCount === 1 ? 'drink' : 'drinks'}{openBar ? '' : ` · ${money(roundTotal, currency)}`}
				</b>
			</p>
			<button type="button" class="btn primary" onclick={() => roundDialog?.showModal()}>
				Show the bartender
			</button>
		</div>
	</div>
{/if}

<dialog bind:this={roundDialog} aria-labelledby="round-title">
	<p class="eyebrow">For your bartender</p>
	<h2 id="round-title">Your round</h2>
	<ul>
		{#each roundLines as line (line.item.id)}
			<li>
				<span class="name">{line.item.name}</span>
				<span class="qty">
					<button
						type="button"
						class="btn small quiet"
						aria-label={`One fewer ${line.item.name}`}
						onclick={() => bump(line.item.id, -1)}>−</button
					>
					<b>{line.qty}</b>
					<button
						type="button"
						class="btn small quiet"
						aria-label={`One more ${line.item.name}`}
						onclick={() => bump(line.item.id, 1)}>+</button
					>
				</span>
				{#if !openBar}<span class="price">{money(line.item.price * line.qty, currency)}</span>{/if}
			</li>
		{/each}
	</ul>
	{#if openBar}
		<p class="muted small">Show this at the bar. It is an open bar, so there is nothing to pay.</p>
	{:else}
		<p class="spread total">
			<span class="eyebrow">Total</span>
			<b class="price">{money(roundTotal, currency)}</b>
		</p>
		<p class="muted small">Show this at the bar. You pay the bartender, in cash or digitally.</p>
	{/if}
	<div class="row">
		<button type="button" class="btn primary" onclick={() => roundDialog?.close()}>Done</button>
		<button
			type="button"
			class="btn quiet"
			onclick={() => {
				round = {};
				roundDialog?.close();
			}}
		>
			Clear round
		</button>
	</div>
</dialog>

<style>
	.open-bar {
		display: inline-block;
		margin-top: 10px;
		padding: 6px 14px 4px;
		border: 1px solid var(--gilt);
		color: var(--gilt);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.menu {
		max-width: 720px;
		padding-block: 20px 48px;
	}
	.menu.has-round {
		padding-bottom: 130px;
	}
	.hero {
		text-align: center;
	}
	.bird {
		width: min(100%, 340px);
		margin: 0 auto;
	}
	.opinion {
		min-height: 2.8em;
		margin: 0 auto;
		max-width: 26ch;
		color: var(--gilt);
	}
	header {
		text-align: center;
		padding-bottom: 24px;
	}
	header h1 {
		margin-top: 8px;
	}

	.tools {
		display: grid;
		gap: 18px;
		padding: 22px 0 24px;
		border-top: 1px solid var(--line);
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		font-size: 12px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--muted);
		margin-bottom: 10px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		font: inherit;
		font-size: 15px;
		white-space: nowrap;
		color: var(--vellum);
		background: none;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 9px 16px 7px;
		min-height: 42px;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		transition:
			background 200ms,
			color 200ms,
			border-color 200ms,
			transform 150ms;
	}
	.chip :global(.profile-icon) {
		color: var(--gilt);
	}
	.chip:hover {
		border-color: var(--gilt);
		transform: translateY(-2px);
	}
	.chip[aria-pressed='true'] {
		background: var(--gilt);
		border-color: var(--gilt);
		color: var(--ink);
	}
	.chip[aria-pressed='true'] :global(.profile-icon) {
		color: var(--ink);
	}
	.decide {
		justify-self: start;
	}
	.group {
		margin-top: 8px;
	}
	.group-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: 26px 0 10px;
		border-bottom: 1px solid var(--gilt);
		font-size: 34px;
	}
	.group-head .count {
		font-family: var(--f-sans);
		font-size: 14px;
		color: var(--muted);
	}
	.profile {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--gilt);
		font-size: 14px;
		letter-spacing: 0.04em;
	}

	.drinks {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.drinks li {
		position: relative;
		padding: 22px 12px;
		margin-inline: -12px;
		border-bottom: 1px solid var(--line);
		transition:
			background 300ms,
			box-shadow 300ms;
	}
	.drinks li:hover,
	.drinks li.open {
		background: rgb(226 185 136 / 0.05);
	}
	.drinks li.lit {
		background: rgb(226 185 136 / 0.14);
		box-shadow: inset 3px 0 0 var(--gilt);
	}
	.top {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 14px;
		align-items: start;
	}
	.top :global(.glass) {
		margin-top: 14px;
		transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	li:hover .top :global(.glass),
	li.open .top :global(.glass),
	li.lit .top :global(.glass) {
		transform: rotate(-8deg) translateY(-2px);
	}
	.what {
		display: grid;
		gap: 4px;
	}
	h3 {
		font-size: 30px;
	}
	.toggle {
		all: unset;
		cursor: pointer;
	}
	/* The whole row opens the drink, while the add button stays on top. */
	.toggle::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.toggle:focus-visible {
		outline: 2px solid var(--peacock);
		outline-offset: 3px;
	}
	.side {
		display: grid;
		justify-items: end;
		gap: 10px;
	}
	.side .price {
		font-size: 20px;
		padding-top: 18px;
	}
	.add {
		position: relative;
		z-index: 1;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid var(--gilt);
		background: transparent;
		color: var(--gilt);
		font: inherit;
		font-size: 20px;
		font-weight: 600;
		line-height: 1;
		display: grid;
		place-items: center;
		cursor: pointer;
		transition:
			background 200ms,
			transform 150ms;
	}
	.add span {
		display: block;
		padding-top: 3px;
	}
	.add:hover {
		background: rgb(226 185 136 / 0.15);
	}
	.add:active {
		transform: scale(0.9);
	}
	.add.has {
		background: var(--gilt);
		color: var(--ink);
	}
	.more {
		margin: 0;
		padding: 16px 0 0 62px;
		display: grid;
		gap: 12px;
	}
	.more table {
		border-collapse: collapse;
		width: 100%;
		max-width: 460px;
	}
	.more caption {
		text-align: left;
		margin-bottom: 4px;
	}
	.more th {
		text-align: left;
		font-weight: 400;
		padding: 5px 12px 4px 0;
		border-bottom: 1px solid var(--line);
	}
	.more td {
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		color: var(--gilt);
		padding: 5px 0 4px 12px;
		border-bottom: 1px solid var(--line);
	}
	.more td.alt {
		color: var(--muted);
		font-size: 15px;
	}
	.drinks li {
		border-left: 0 solid var(--drink);
	}
	.drinks li.open {
		box-shadow: inset 3px 0 0 var(--drink);
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

	.tray {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 20;
		background: var(--olive-deep);
		border-top: 1px solid var(--gilt);
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
	.tray-in {
		max-width: 720px;
		min-height: 76px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.tray p {
		display: grid;
	}
	.tray b {
		font-weight: 400;
		font-size: 19px;
		color: var(--gilt);
	}

	dialog {
		width: min(calc(100% - 32px), 460px);
		background: var(--vellum);
		color: var(--ink);
		border: 0;
		padding: 28px 24px 24px;
	}
	dialog::backdrop {
		background: rgb(20 24 12 / 0.75);
	}
	dialog[open] {
		animation: rise 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
	}
	dialog .eyebrow,
	dialog .muted {
		color: #5a5f48;
	}
	dialog h2 {
		color: var(--ink);
		font-size: 34px;
		margin-bottom: 10px;
	}
	dialog ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	dialog li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 4px 12px;
		padding: 12px 0;
		border-bottom: 1px solid #cdbf9f;
	}
	dialog li .name {
		grid-column: 1 / -1;
		font-family: var(--f-display);
		font-size: 24px;
		line-height: 1.2;
	}
	dialog .qty {
		display: inline-flex;
		align-items: center;
		gap: 14px;
	}
	dialog .qty .btn {
		min-width: 40px;
		font-size: 18px;
		color: var(--ink);
		border-color: #cdbf9f;
	}
	dialog .price {
		color: var(--gilt-deep);
	}
	dialog .total {
		padding: 14px 0 6px;
	}
	dialog .total b {
		font-family: var(--f-display);
		font-weight: 400;
		font-size: 32px;
	}
	dialog .small {
		font-size: 15px;
		margin-bottom: 18px;
	}
	dialog .btn.primary {
		background: var(--olive);
		border-color: var(--olive);
		color: var(--gilt);
	}
	dialog .btn.quiet {
		color: #5a5f48;
		border-color: #cdbf9f;
	}

	@media (max-width: 480px) {
		h3 {
			font-size: 26px;
		}
		.top {
			gap: 10px;
		}
		.more {
			padding-left: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		dialog[open] {
			animation: none;
		}
	}
</style>
