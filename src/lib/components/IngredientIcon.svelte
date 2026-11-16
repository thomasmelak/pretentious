<!--
	A small coloured picture of an ingredient, worked out from its shelf and name: a bottle
	in the spirit's colour, half a lime, a can of tonic, a sprig of mint.
-->
<script lang="ts">
	import type { Ingredient } from '#lib/shared/types.ts';

	interface Props {
		ingredient: Pick<Ingredient, 'id' | 'name' | 'category' | 'family'>;
		size?: number;
	}

	let { ingredient, size = 32 }: Props = $props();

	type Shape =
		| 'bottle'
		| 'round'
		| 'wine'
		| 'can'
		| 'citrus'
		| 'pineapple'
		| 'carton'
		| 'jar'
		| 'dasher'
		| 'leaf'
		| 'egg'
		| 'olive'
		| 'cherry'
		| 'bean'
		| 'cube'
		| 'slice'
		| 'shaker'
		| 'berry'
		| 'root';

	const FAMILY: Record<string, string> = {
		gin: '#CFE7EA',
		vodka: '#E8EEF1',
		whiskey: '#C27A2C',
		rum: '#E9DDB8',
		agave: '#E5C463',
		brandy: '#9A4E22'
	};

	/** First match wins: [pattern on id and name, shape, colour]. */
	const RULES: [RegExp, Shape, string][] = [
		[/campari|bitter aperitivo/, 'round', '#C4202B'],
		[/aperol/, 'round', '#F06A23'],
		[/sweet.?vermouth|rosso/, 'round', '#6E1E24'],
		[/dry.?vermouth|blanc|lillet/, 'round', '#E6DFB2'],
		[/orange.?liqueur|triple|cointreau|curacao/, 'round', '#F2A23A'],
		[/coffee.?liqueur|kahl/, 'round', '#3D2417'],
		[/elderflower|st.?germain/, 'round', '#F2E3A0'],
		[/amaretto|almond/, 'round', '#B5652B'],
		[/chartreuse|green/, 'round', '#9DBA3A'],
		[/maraschino|cherry.?liqueur/, 'round', '#E9E2D0'],
		[/prosecco|champagne|sparkling.?wine|cava/, 'wine', '#E9D27A'],
		[/red.?wine/, 'wine', '#7A1F2C'],
		[/wine/, 'wine', '#E6D79A'],
		[/cola/, 'can', '#4A2A1C'],
		[/ginger.?beer|ginger.?ale/, 'can', '#D9A441'],
		[/tonic/, 'can', '#BFE3E6'],
		[/soda|sparkling.?water|club/, 'can', '#9FCFE0'],
		[/lime/, 'citrus', '#8DBE4E'],
		[/lemon/, 'citrus', '#F1D04B'],
		[/grapefruit/, 'citrus', '#F08A6C'],
		[/orange/, 'citrus', '#F0973A'],
		[/pineapple/, 'pineapple', '#F4C542'],
		[/cranberry|tomato|pomegranate/, 'carton', '#B3263A'],
		[/espresso|coffee/, 'bean', '#6B3F25'],
		[/cream|milk/, 'carton', '#F4EEDF'],
		[/honey/, 'jar', '#E1A030'],
		[/grenadine|raspberry/, 'jar', '#C12D3E'],
		[/orgeat/, 'jar', '#EFE3C8'],
		[/agave.?syrup|agave.?nectar/, 'jar', '#E3B656'],
		[/syrup|simple/, 'jar', '#F2E7C9'],
		[/angostura/, 'dasher', '#8A3A1E'],
		[/peychaud/, 'dasher', '#C23A3A'],
		[/orange.?bitters/, 'dasher', '#E88A2E'],
		[/bitters/, 'dasher', '#7A4A2A'],
		[/mint|basil|herb/, 'leaf', '#5E9B4A'],
		[/egg/, 'egg', '#F4EBD8'],
		[/olive/, 'olive', '#8FA548'],
		[/cherr/, 'cherry', '#A3122A'],
		[/sugar|cube/, 'cube', '#F7F3EA'],
		[/salt/, 'shaker', '#F4F1E8'],
		[/cucumber/, 'slice', '#9FCB6B'],
		[/berr/, 'berry', '#7C2E5A'],
		[/ginger|root/, 'root', '#D9B26A'],
		[/chocolate|cacao|cocoa|nutmeg|cinnamon/, 'bean', '#4A2C1A']
	];

	const BY_SHELF: Record<string, [Shape, string]> = {
		spirit: ['bottle', '#E2B988'],
		liqueur: ['round', '#E2B988'],
		wine: ['wine', '#E6D79A'],
		mixer: ['can', '#BFE3E6'],
		juice: ['carton', '#F2C14E'],
		syrup: ['jar', '#F2E7C9'],
		bitters: ['dasher', '#7A4A2A'],
		fresh: ['leaf', '#5E9B4A']
	};

	const look = $derived.by((): [Shape, string] => {
		const key = `${ingredient.id} ${ingredient.name}`.toLowerCase();
		if (ingredient.category === 'spirit') {
			const dark = /dark|aged|añejo|anejo|reposado|black|spiced/.test(key);
			const smoky = /mezcal|islay|smok/.test(key);
			const base = FAMILY[ingredient.family ?? ''] ?? '#E2B988';
			return ['bottle', dark ? '#7A3F1C' : smoky ? '#C9A24E' : base];
		}
		for (const [re, shape, color] of RULES) if (re.test(key)) return [shape, color];
		return BY_SHELF[ingredient.category] ?? ['jar', '#E2B988'];
	});
	const shape = $derived(look[0]);
	const fill = $derived(look[1]);
</script>

<svg
	class="ing-icon"
	viewBox="0 0 32 32"
	width={size}
	height={size}
	aria-hidden="true"
	stroke="#1E2312"
	stroke-width="1.1"
	stroke-linejoin="round"
	stroke-linecap="round"
>
	{#if shape === 'bottle'}
		<path d="M13.5 2.5h5v2h-5z" fill="#3A3A2E" />
		<path
			d="M13.8 4.5h4.4v4c0 1 3.8 2.6 3.8 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V14.5c0-3.4 3.8-5 3.8-6z"
			fill={fill}
		/>
		<path d="M10.5 17h11v7h-11z" fill="#F2EADB" />
		<path d="M12.5 20.5h7" stroke-width="0.9" opacity="0.6" />
		<path d="M12 12.5c0 3 0 10-.2 15" stroke="#fff" stroke-width="1.2" opacity="0.4" fill="none" />
	{:else if shape === 'round'}
		<path d="M14 3h4v2h-4z" fill="#3A3A2E" />
		<path
			d="M14.3 5h3.4v4.2c3.6.9 6.3 4 6.3 7.8 0 3.2-1 6.2-1.8 9.4a3 3 0 0 1-2.9 2.6h-6.6a3 3 0 0 1-2.9-2.6C9 23.2 8 20.2 8 17c0-3.8 2.7-6.9 6.3-7.8z"
			fill={fill}
		/>
		<ellipse cx="16" cy="19" rx="5.4" ry="3.6" fill="#F2EADB" />
		<path d="M11 13.5c-1 2-1 5 0 8" stroke="#fff" stroke-width="1.2" opacity="0.4" fill="none" />
	{:else if shape === 'wine'}
		<path d="M14 2h4v3h-4z" fill="#C9A24E" />
		<path
			d="M14 5h4v5.5c2.3 1.2 3.2 2.8 3.2 5V29a1.5 1.5 0 0 1-1.5 1.5h-7.4A1.5 1.5 0 0 1 10.8 29V15.5c0-2.2.9-3.8 3.2-5z"
			fill="#2E4A2A"
		/>
		<path d="M10.8 18h10.4v6H10.8z" fill={fill} />
	{:else if shape === 'can'}
		<path d="M10 6.5c0-1 2.7-1.8 6-1.8s6 .8 6 1.8v19c0 1-2.7 1.8-6 1.8s-6-.8-6-1.8z" fill={fill} />
		<ellipse cx="16" cy="6.5" rx="6" ry="1.8" fill="#D9D6CC" />
		<path d="M10 11h12M10 21h12" stroke-width="0.9" opacity="0.5" />
		<circle cx="16" cy="16" r="2.4" fill="#F2EADB" />
		<path d="M12 9v14" stroke="#fff" stroke-width="1.2" opacity="0.35" />
	{:else if shape === 'citrus'}
		<circle cx="16" cy="17" r="11" fill={fill} />
		<circle cx="16" cy="17" r="8.6" fill="#FFF8DC" opacity="0.7" stroke="none" />
		<circle cx="16" cy="17" r="7.6" fill={fill} opacity="0.8" stroke="none" />
		{#each [0, 45, 90, 135] as a (a)}
			<path d="M8.6 17h14.8" stroke="#FFF8DC" stroke-width="1" transform="rotate({a} 16 17)" />
		{/each}
		<path d="M18 4.5c2-1.6 4.4-1.6 5.8-.4-1.4 1.6-3.6 2-5.8.4z" fill="#5E9B4A" />
	{:else if shape === 'pineapple'}
		<path
			d="M16 9c-2-3-1.5-5.5 0-7 1.5 1.5 2 4 0 7zM16 9c-3-1.5-5-1-6 .5 2 .8 4 .9 6-.5zM16 9c3-1.5 5-1 6 .5-2 .8-4 .9-6-.5z"
			fill="#5E9B4A"
		/>
		<ellipse cx="16" cy="19.5" rx="7" ry="10" fill={fill} />
		<path d="M10.5 15l11 9M10.5 24l11-9M12 12l8 15M20 12l-8 15" stroke-width="0.8" opacity="0.5" />
	{:else if shape === 'carton'}
		<path d="M10 9l3-5h6l3 5v19.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 10 28.5z" fill="#F2EADB" />
		<path d="M10 9h12" />
		<path d="M10 15h12v9H10z" fill={fill} />
	{:else if shape === 'jar'}
		<path d="M11 5h10v3h-10z" fill="#3A3A2E" />
		<path
			d="M10.5 8h11a2 2 0 0 1 2 2v17a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3V10a2 2 0 0 1 2-2z"
			fill="#F2EADB"
			opacity="0.9"
		/>
		<path d="M8.5 14h15v13a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z" fill={fill} />
		<path d="M11 16v10" stroke="#fff" stroke-width="1.2" opacity="0.45" />
	{:else if shape === 'dasher'}
		<path d="M14.5 2h3v4h-3z" fill="#F2D04B" />
		<path
			d="M13 6h6v3c2.2.6 3.5 2.2 3.5 4.5V28a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V13.5c0-2.3 1.3-3.9 3.5-4.5z"
			fill={fill}
		/>
		<path d="M9 14h14v12H9z" fill="#F2EADB" />
		<path d="M11.5 18h9M11.5 21h9M11.5 24h6" stroke-width="0.8" opacity="0.6" />
	{:else if shape === 'leaf'}
		<path d="M16 29c0-8 0-15 1-23" fill="none" stroke="#3F6E32" stroke-width="1.6" />
		<path d="M16 22c-7 0-10-4-10-9 5 0 9 2.5 10 9z" fill={fill} />
		<path d="M16.5 15c6-1 9.5-5 9-10-5 .5-9 4-9 10z" fill="#73B35C" />
		<path d="M16.8 8.5C14 6.5 13.6 3.8 14.8 2c2 1.4 2.8 4 2 6.5z" fill={fill} />
	{:else if shape === 'egg'}
		<path d="M16 3c5 0 9 9 9 15a9 9 0 0 1-18 0c0-6 4-15 9-15z" fill={fill} />
		<path d="M11.5 13c-.8 2-1 4-.8 6" stroke="#fff" stroke-width="1.4" opacity="0.6" fill="none" />
	{:else if shape === 'olive'}
		<path d="M4 28L27 5" stroke="#C9B48A" stroke-width="1.6" />
		<ellipse cx="12" cy="20" rx="6.5" ry="5" transform="rotate(-45 12 20)" fill={fill} />
		<ellipse cx="20" cy="12" rx="6.5" ry="5" transform="rotate(-45 20 12)" fill={fill} />
		<circle cx="13" cy="19" r="1.8" fill="#C0452E" />
		<circle cx="21" cy="11" r="1.8" fill="#C0452E" />
	{:else if shape === 'cherry'}
		<path d="M12 21c2-7 6-13 12-17M20 22c0-6 1-12 4-18" fill="none" stroke="#5E7B3A" stroke-width="1.4" />
		<circle cx="11" cy="23" r="6" fill={fill} />
		<circle cx="21" cy="24" r="5.4" fill={fill} />
		<circle cx="9" cy="21" r="1.4" fill="#fff" opacity="0.6" stroke="none" />
	{:else if shape === 'bean'}
		<ellipse cx="12" cy="18" rx="6" ry="8.5" transform="rotate(-25 12 18)" fill={fill} />
		<ellipse cx="21" cy="14" rx="5.5" ry="8" transform="rotate(20 21 14)" fill={fill} />
		<path
			d="M10 11c3 4 1 9 3.5 14M19.5 7c-1.5 4 2.5 9 1 14"
			fill="none"
			stroke="#1E2312"
			stroke-width="1"
			opacity="0.6"
		/>
	{:else if shape === 'cube'}
		<path d="M8 11l8-4 8 4v10l-8 4-8-4z" fill={fill} />
		<path d="M8 11l8 4 8-4M16 15v10" fill="none" />
	{:else if shape === 'shaker'}
		<path d="M11 6h10l1 3H10z" fill="#BDBDB0" />
		<path d="M10 9h12l-1.5 19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z" fill={fill} />
		<circle cx="14" cy="7.5" r="0.6" fill="#1E2312" />
		<circle cx="18" cy="7.5" r="0.6" fill="#1E2312" />
	{:else if shape === 'slice'}
		<circle cx="16" cy="16" r="11" fill="#3F7A3A" />
		<circle cx="16" cy="16" r="9.2" fill={fill} />
		{#each [0, 60, 120, 180, 240, 300] as a (a)}
			<ellipse cx="16" cy="11" rx="1" ry="1.8" fill="#E8F2D2" stroke="none" transform="rotate({a} 16 16)" />
		{/each}
	{:else if shape === 'berry'}
		{#each [[12, 14], [19, 13], [15.5, 20], [21, 20], [10, 21]] as [x, y], i (i)}
			<circle cx={x} cy={y} r="4.6" fill={fill} />
		{/each}
		<path d="M15 9c1-3 3-4 5-4" stroke="#5E9B4A" stroke-width="1.4" fill="none" />
	{:else}
		<path
			d="M5 18c2-4 6-5 9-4 1-4 5-6 8-4 3 1 5 4 4 7-1 4-5 5-8 4-2 3-6 4-9 2-3-1-5-3-4-5z"
			fill={fill}
		/>
	{/if}
</svg>

<style>
	.ing-icon {
		display: block;
		flex: none;
		overflow: visible;
	}
</style>
