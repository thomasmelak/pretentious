<!--
	A large drawing of a drink: the right glass, filled with the drink's colour, with ice,
	bubbles and the garnish worked out from the recipe. It pours itself in when it appears.
-->
<script lang="ts">
	interface Props {
		glass?: string;
		color?: string;
		garnish?: string;
		method?: string;
		fizz?: boolean;
		size?: number;
	}

	let { glass = '', color = '#E2B988', garnish = '', method = '', fizz = false, size = 260 }: Props =
		$props();

	const uid = `d${Math.random().toString(36).slice(2, 8)}`;

	type Kind = 'coupe' | 'martini' | 'rocks' | 'highball' | 'flute' | 'wine' | 'mug' | 'hurricane';

	const kind = $derived.by((): Kind => {
		const g = glass.toLowerCase();
		for (const k of ['martini', 'rocks', 'highball', 'flute', 'wine', 'mug', 'hurricane'] as const) {
			if (g.includes(k)) return k;
		}
		return 'coupe';
	});

	interface Shape {
		/** The glass outline. */
		outline: string;
		/** The inside of the glass, where liquid can go. */
		inside: string;
		/** Where the liquid starts. */
		top: number;
		/** The rim: left x, right x, y. */
		rim: [number, number, number];
		stem?: [number, number];
		ice: [x: number, y: number, s: number, turn: number][];
		shine: string;
	}

	const SHAPES: Record<Kind, Shape> = {
		coupe: {
			outline: 'M38 72 H162 C162 122 132 142 100 142 C68 142 38 122 38 72 Z',
			inside: 'M41 75 H159 C158 120 130 139 100 139 C70 139 42 120 41 75 Z',
			top: 84,
			rim: [38, 162, 72],
			stem: [142, 214],
			ice: [],
			shine: 'M52 86 C54 106 64 120 78 128'
		},
		martini: {
			outline: 'M28 58 H172 L100 140 Z',
			inside: 'M33 61 H167 L100 135 Z',
			top: 72,
			rim: [28, 172, 58],
			stem: [140, 214],
			ice: [],
			shine: 'M48 70 L82 108'
		},
		rocks: {
			outline: 'M44 98 H156 L149 222 H51 Z',
			inside: 'M48 101 H152 L146 204 H54 Z',
			top: 126,
			rim: [44, 156, 98],
			ice: [[100, 160, 46, -6]],
			shine: 'M58 112 L63 196'
		},
		highball: {
			outline: 'M64 36 H136 L131 222 H69 Z',
			inside: 'M68 39 H132 L128 206 H72 Z',
			top: 66,
			rim: [64, 136, 36],
			ice: [
				[90, 186, 28, 8],
				[112, 160, 28, -10],
				[88, 132, 28, 14],
				[112, 104, 26, -4]
			],
			shine: 'M75 52 L80 196'
		},
		flute: {
			outline: 'M79 28 H121 C121 108 115 138 100 148 C85 138 79 108 79 28 Z',
			inside: 'M82 31 H118 C118 106 112 134 100 143 C88 134 82 106 82 31 Z',
			top: 52,
			rim: [79, 121, 28],
			stem: [148, 214],
			ice: [],
			shine: 'M88 46 C88 90 90 116 95 130'
		},
		wine: {
			outline: 'M60 40 H140 C148 112 128 152 100 152 C72 152 52 112 60 40 Z',
			inside: 'M63 43 H137 C144 110 126 149 100 149 C74 149 56 110 63 43 Z',
			top: 92,
			rim: [60, 140, 40],
			stem: [152, 214],
			ice: [],
			shine: 'M70 70 C68 104 76 128 88 140'
		},
		mug: {
			outline: 'M48 70 H142 V204 Q142 222 124 222 H66 Q48 222 48 204 Z',
			inside: 'M51 73 H139 V203 Q139 219 123 219 H67 Q51 219 51 203 Z',
			top: 84,
			rim: [48, 142, 70],
			ice: [
				[78, 84, 26, 10],
				[110, 80, 24, -12]
			],
			shine: 'M60 92 L60 200'
		},
		hurricane: {
			outline:
				'M70 26 H130 C130 68 112 84 112 110 C112 140 134 150 134 180 C124 194 112 197 100 197 C88 197 76 194 66 180 C66 150 88 140 88 110 C88 84 70 68 70 26 Z',
			inside:
				'M73 29 H127 C126 68 109 84 109 110 C109 141 131 151 131 179 C122 191 111 194 100 194 C89 194 78 191 69 179 C69 151 91 141 91 110 C91 84 74 68 73 29 Z',
			top: 56,
			rim: [70, 130, 26],
			stem: [197, 214],
			ice: [
				[100, 172, 24, 8],
				[100, 146, 22, -10]
			],
			shine: 'M80 40 C82 70 94 88 95 110'
		}
	};

	const shape = $derived(SHAPES[kind]);

	/** What the garnish text describes, as things to draw. */
	const fruitColor = (text: string) =>
		/lime/.test(text)
			? '#9CC45A'
			: /lemon/.test(text)
				? '#F1D04B'
				: /grapefruit/.test(text)
					? '#F08A6C'
					: /pineapple/.test(text)
						? '#F4C542'
						: /cucumber/.test(text)
							? '#B9D98A'
							: '#F0973A';

	const garnishes = $derived.by(() => {
		const all = garnish.toLowerCase();
		// "Olive or lemon twist": the bartender picks one, so draw the first.
		const text = all.split(/\bor\b/)[0];
		const found: { kind: 'wheel' | 'peel' | 'cherry' | 'olive' | 'mint' | 'beans' | 'rim'; color: string }[] = [];
		if (/salt rim|sugar rim/.test(text)) found.push({ kind: 'rim', color: /salt/.test(text) ? '#F4F1E8' : '#FFF7DA' });
		if (/olive/.test(text)) found.push({ kind: 'olive', color: '#8FA548' });
		if (/cherr/.test(text)) found.push({ kind: 'cherry', color: '#A3122A' });
		if (/coffee bean/.test(text)) found.push({ kind: 'beans', color: '#9A6340' });
		if (/mint/.test(text)) found.push({ kind: 'mint', color: '#5E9B4A' });
		for (const part of text.split(',')) {
			if (/wheel|wedge|slice|shell/.test(part) || (/cucumber/.test(part) && !/peel/.test(part)))
				found.push({ kind: 'wheel', color: fruitColor(part) });
			else if (/peel|twist|zest/.test(part)) found.push({ kind: 'peel', color: fruitColor(part) });
		}
		return found;
	});

	const iced = $derived(shape.ice.length > 0 || /over (ice|one large cube)|fill with ice|crushed ice/i.test(method));
	const cubes = $derived(
		shape.ice.length ? shape.ice : iced ? ([[100, shape.top + 30, 30, 6]] as Shape['ice']) : []
	);
	const [left, right, rimY] = $derived(shape.rim);
	const mid = $derived((left + right) / 2);
</script>

<svg
	class="drink {kind}"
	viewBox="0 0 200 240"
	width={size}
	height={size * 1.2}
	role="img"
	aria-label={`${glass || 'Glass'}${garnish ? `, ${garnish.toLowerCase()}` : ''}`}
>
	<defs>
		<clipPath id="{uid}-in"><path d={shape.inside} /></clipPath>
		<linearGradient id="{uid}-liq" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={color} stop-opacity="0.78" />
			<stop offset="1" stop-color={color} stop-opacity="1" />
		</linearGradient>
		<linearGradient id="{uid}-shade" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#000" stop-opacity="0" />
			<stop offset="0.7" stop-color="#000" stop-opacity="0.05" />
			<stop offset="1" stop-color="#000" stop-opacity="0.3" />
		</linearGradient>
		<linearGradient id="{uid}-copper" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#E7A46C" />
			<stop offset="0.45" stop-color="#C47A43" />
			<stop offset="1" stop-color="#7E4524" />
		</linearGradient>
		<radialGradient id="{uid}-glow" cx="0.5" cy="0.55" r="0.5">
			<stop offset="0" stop-color={color} stop-opacity="0.35" />
			<stop offset="1" stop-color={color} stop-opacity="0" />
		</radialGradient>
	</defs>

	<ellipse class="glow" cx="100" cy="128" rx="98" ry="104" fill="url(#{uid}-glow)" />
	<ellipse cx="100" cy="226" rx="62" ry="6" fill="#000" opacity="0.25" />

	<!-- Mint sits behind the glass, poking out above the rim. -->
	{#each garnishes.filter((g) => g.kind === 'mint') as g, i (i)}
		<g class="garnish mint" transform="translate({left + (right - left) * 0.3} {rimY + 6})">
			<path d="M0 0 C-2 -20 2 -36 6 -50" stroke="#3F6E32" stroke-width="2" fill="none" />
			<path d="M3 -24 C-16 -28 -22 -42 -18 -48 C-6 -46 2 -36 3 -24 Z" fill={g.color} />
			<path d="M4 -30 C20 -38 28 -52 22 -58 C10 -54 2 -44 4 -30 Z" fill="#6FB257" />
			<path d="M6 -48 C0 -60 2 -70 8 -74 C14 -66 12 -56 6 -48 Z" fill={g.color} />
		</g>
	{/each}

	<!-- The glass, with the drink inside. -->
	<path d={shape.outline} class="pane" />
	<g clip-path="url(#{uid}-in)">
		<g class="pour">
			<rect x="0" y={shape.top} width="200" height={240 - shape.top} fill="url(#{uid}-liq)" />
			<rect x="0" y={shape.top} width="200" height={240 - shape.top} fill="url(#{uid}-shade)" />
			<rect x="0" y={shape.top} width="200" height="2.5" fill="#fff" opacity="0.35" />
			{#each cubes as [x, y, s, turn], i (i)}
				<rect
					class="ice"
					x={x - s / 2}
					y={y - s / 2}
					width={s}
					height={s}
					rx={s / 6}
					transform="rotate({turn} {x} {y})"
				/>
			{/each}
			{#if fizz}
				<g class="bubbles">
					{#each [mid - 20, mid - 6, mid + 10, mid + 22, mid - 12, mid + 4] as x, i (i)}
						<circle cx={x} cy="208" r={1.6 + (i % 3) * 0.7} style:animation-delay="{i * 0.45}s" />
					{/each}
				</g>
			{/if}
			{#each garnishes.filter((g) => g.kind === 'beans') as g, i (i)}
				{#each [-14, 0, 14] as dx (dx)}
					<ellipse cx={mid + dx} cy={shape.top + 1} rx="5" ry="3.4" fill={g.color} />
				{/each}
			{/each}
			{#each garnishes.filter((g) => g.kind === 'cherry') as g, i (i)}
				<circle cx={mid + 6} cy={shape.top + 14} r="9" fill={g.color} />
				<circle cx={mid + 3} cy={shape.top + 11} r="2.4" fill="#fff" opacity="0.5" />
			{/each}
		</g>
	</g>
	{#if kind === 'mug'}
		<path d={shape.outline} fill="url(#{uid}-copper)" clip-path="url(#{uid}-mugbody)" />
		<clipPath id="{uid}-mugbody"><rect x="0" y={shape.top + 8} width="200" height="240" /></clipPath>
		<path d="M142 94 H154 Q170 94 170 110 V158 Q170 174 154 174 H142" class="handle" />
	{/if}
	<path d={shape.outline} class="edge" />
	<path d={shape.shine} class="shine" />
	{#if shape.stem}
		<path d="M100 {shape.stem[0]} V{shape.stem[1]}" class="edge stem" />
		<ellipse cx="100" cy="217" rx="38" ry="6" class="edge foot" />
	{/if}

	<!-- Garnishes on the rim. -->
	{#each garnishes as g, i (i)}
		{#if g.kind === 'rim'}
			<g class="garnish">
				{#each Array.from({ length: 18 }, (_, k) => k) as k (k)}
					<circle cx={left + 3 + ((right - left - 6) * k) / 17} cy={rimY + (k % 2) * 1.6} r="1.7" fill={g.color} />
				{/each}
			</g>
		{:else if g.kind === 'wheel'}
			<g class="garnish wheel" transform="translate({right - 4} {rimY - 2}) rotate(-18)">
				<circle r="22" fill={g.color} />
				<circle r="18" fill="#FFF8DC" opacity="0.55" />
				<circle r="16.5" fill={g.color} opacity="0.75" />
				{#each [0, 45, 90, 135] as a (a)}
					<path d="M-16 0 H16" stroke="#FFF8DC" stroke-width="1.3" transform="rotate({a})" opacity="0.8" />
				{/each}
				<path d="M-24 2 H-2 V10 H-24 Z" fill="#2B2B22" opacity="0" />
			</g>
		{:else if g.kind === 'peel'}
			<path
				class="garnish peel"
				d="M{right - 10} {rimY - 4} C{right + 14} {rimY - 18} {right + 22} {rimY + 6} {right + 8} {rimY + 18} C{right} {rimY + 26} {right + 6} {rimY + 38} {right + 16} {rimY + 44}"
				stroke={g.color}
				stroke-width="7"
				stroke-linecap="round"
				fill="none"
			/>
		{:else if g.kind === 'olive'}
			<g class="garnish olive">
				<path d="M{right - 18} {rimY - 22} L{mid - 8} {shape.top + 30}" stroke="#D9C9A3" stroke-width="2.2" />
				<ellipse cx={mid + 6} cy={shape.top + 16} rx="8" ry="6.5" fill={g.color} transform="rotate(35 {mid + 6} {shape.top + 16})" />
				<ellipse cx={mid + 16} cy={shape.top + 4} rx="8" ry="6.5" fill={g.color} transform="rotate(35 {mid + 16} {shape.top + 4})" />
				<circle cx={mid + 9} cy={shape.top + 12} r="2" fill="#B5302A" />
			</g>
		{/if}
	{/each}
</svg>

<style>
	.drink {
		display: block;
		overflow: visible;
		max-width: 100%;
		height: auto;
		color: var(--vellum);
	}
	.pane {
		fill: rgb(255 255 255 / 0.05);
	}
	.edge {
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linejoin: round;
		stroke-linecap: round;
		opacity: 0.85;
	}
	.handle {
		fill: none;
		stroke: #b0693a;
		stroke-width: 9;
		stroke-linecap: round;
	}
	.shine {
		fill: none;
		stroke: #fff;
		stroke-width: 5;
		stroke-linecap: round;
		opacity: 0.22;
	}
	.ice {
		fill: rgb(255 255 255 / 0.22);
		stroke: rgb(255 255 255 / 0.55);
		stroke-width: 1.2;
	}
	.pour {
		transform-box: fill-box;
		animation: pour 900ms cubic-bezier(0.3, 0.7, 0.2, 1) both;
	}
	.garnish {
		animation: drop 500ms 650ms cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
	}
	.glow {
		animation: breathe 4s ease-in-out infinite alternate;
	}
	.bubbles circle {
		fill: rgb(255 255 255 / 0.65);
		animation: rise 2.8s ease-in infinite;
	}
	@keyframes pour {
		from {
			transform: translateY(70%);
		}
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-18px);
		}
	}
	@keyframes breathe {
		to {
			opacity: 0.55;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		100% {
			transform: translateY(-130px);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pour,
		.garnish,
		.glow,
		.bubbles circle {
			animation: none;
		}
	}
</style>
