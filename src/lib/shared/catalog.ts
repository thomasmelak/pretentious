import type { Category, Family, Ingredient, Profile, Recipe } from './types.ts';

export const CATEGORIES: { id: Category; label: string }[] = [
	{ id: 'spirit', label: 'Spirits' },
	{ id: 'liqueur', label: 'Liqueurs & vermouth' },
	{ id: 'wine', label: 'Wine' },
	{ id: 'mixer', label: 'Mixers' },
	{ id: 'juice', label: 'Juice' },
	{ id: 'syrup', label: 'Syrups' },
	{ id: 'bitters', label: 'Bitters' },
	{ id: 'fresh', label: 'Fresh & pantry' }
];

export const FAMILIES: { id: Family; label: string }[] = [
	{ id: 'gin', label: 'Gin' },
	{ id: 'whiskey', label: 'Whiskey' },
	{ id: 'rum', label: 'Rum' },
	{ id: 'agave', label: 'Tequila & mezcal' },
	{ id: 'vodka', label: 'Vodka' },
	{ id: 'brandy', label: 'Brandy' }
];

/** Label for drinks with no base spirit. */
export const NO_FAMILY = 'Aperitifs & liqueurs';

export const PROFILES: { id: Profile; label: string; short: string; blurb: string }[] = [
	{ id: 'stirred', label: 'Strong & stirred', short: 'Spirit-forward', blurb: 'Silky, cold, unhurried' },
	{ id: 'sour', label: 'Sharp & sour', short: 'Sour', blurb: 'Citrus, bright, awake' },
	{ id: 'bitter', label: 'Bitter', short: 'Bitter', blurb: 'Grown-up and a little stern' },
	{ id: 'long', label: 'Long & fizzy', short: 'Long', blurb: 'Tall, sparkling, sociable' },
	{ id: 'rich', label: 'Rich', short: 'Rich', blurb: 'Coffee, cream, dessert' }
];

export const GLASSES = [
	'Coupe',
	'Martini',
	'Rocks',
	'Highball',
	'Flute',
	'Wine glass',
	'Copper mug',
	'Hurricane'
];

const SPIRIT_FAMILY: Record<string, Family> = {
	gin: 'gin',
	vodka: 'vodka',
	'white-rum': 'rum',
	'dark-rum': 'rum',
	tequila: 'agave',
	mezcal: 'agave',
	bourbon: 'whiskey',
	rye: 'whiskey',
	scotch: 'whiskey',
	cognac: 'brandy'
};

const ing = (category: Category, list: [string, string][]): Ingredient[] =>
	list.map(([id, name]) => ({
		id,
		name,
		category,
		...(SPIRIT_FAMILY[id] ? { family: SPIRIT_FAMILY[id] } : {})
	}));

export const INGREDIENTS: Ingredient[] = [
	...ing('spirit', [
		['gin', 'Gin'],
		['vodka', 'Vodka'],
		['white-rum', 'White rum'],
		['dark-rum', 'Dark rum'],
		['tequila', 'Tequila blanco'],
		['mezcal', 'Mezcal'],
		['bourbon', 'Bourbon'],
		['rye', 'Rye whiskey'],
		['scotch', 'Scotch'],
		['cognac', 'Cognac']
	]),
	...ing('liqueur', [
		['campari', 'Campari'],
		['aperol', 'Aperol'],
		['sweet-vermouth', 'Sweet vermouth'],
		['dry-vermouth', 'Dry vermouth'],
		['orange-liqueur', 'Orange liqueur'],
		['maraschino', 'Maraschino liqueur'],
		['green-chartreuse', 'Green Chartreuse'],
		['coffee-liqueur', 'Coffee liqueur'],
		['amaretto', 'Amaretto'],
		['elderflower', 'Elderflower liqueur'],
		['absinthe', 'Absinthe']
	]),
	...ing('wine', [['sparkling-wine', 'Sparkling wine']]),
	...ing('mixer', [
		['soda', 'Soda water'],
		['tonic', 'Tonic water'],
		['ginger-beer', 'Ginger beer'],
		['cola', 'Cola']
	]),
	...ing('juice', [
		['lime', 'Lime juice'],
		['lemon', 'Lemon juice'],
		['orange-juice', 'Orange juice'],
		['grapefruit', 'Grapefruit juice'],
		['pineapple', 'Pineapple juice'],
		['cranberry', 'Cranberry juice']
	]),
	...ing('syrup', [
		['simple', 'Simple syrup'],
		['honey', 'Honey syrup'],
		['agave', 'Agave syrup'],
		['grenadine', 'Grenadine'],
		['orgeat', 'Orgeat']
	]),
	...ing('bitters', [
		['angostura', 'Angostura bitters'],
		['orange-bitters', 'Orange bitters'],
		['peychauds', "Peychaud's bitters"]
	]),
	...ing('fresh', [
		['mint', 'Fresh mint'],
		['cucumber', 'Cucumber'],
		['olives', 'Olives'],
		['egg-white', 'Egg white'],
		['cream', 'Cream'],
		['coconut-cream', 'Coconut cream'],
		['espresso', 'Espresso'],
		['ice', 'Ice']
	])
];

type Row = [id: string, amount: string, optional?: 'optional'];

const r = (
	id: string,
	name: string,
	style: string,
	glass: string,
	price: number,
	rows: Row[],
	method: string,
	note: string,
	garnish?: string
): Recipe => ({
	id,
	name,
	style,
	glass,
	price,
	method,
	note,
	garnish,
	ingredients: rows.map(([iid, amount, opt]) => ({
		id: iid,
		amount,
		...(opt ? { optional: true } : {})
	}))
});

export const RECIPES: Recipe[] = [
	r('martini', 'Martini', 'Stirred · Spirit-forward', 'Coupe', 14,
		[['gin', '2½ oz'], ['dry-vermouth', '½ oz'], ['orange-bitters', '1 dash', 'optional'], ['olives', '1', 'optional']],
		'Stir with ice until very cold. Strain into a frozen coupe.',
		'Cold, clean and faintly briny. The drink the peacock judges you by.', 'Olive or lemon twist'),
	r('negroni', 'Negroni', 'Stirred · Bitter', 'Rocks', 13,
		[['gin', '1 oz'], ['campari', '1 oz'], ['sweet-vermouth', '1 oz']],
		'Stir with ice. Strain over one large cube.',
		'Bitter, bright and exactly as sweet as it needs to be.', 'Orange peel'),
	r('old-fashioned', 'Old Fashioned', 'Stirred · Spirit-forward', 'Rocks', 14,
		[['bourbon', '2 oz'], ['simple', '¼ oz'], ['angostura', '2 dashes'], ['orange-bitters', '1 dash', 'optional']],
		'Stir with ice. Strain over one large cube.',
		'Whiskey, lightly seasoned. Nothing to hide behind.', 'Orange peel'),
	r('manhattan', 'Manhattan', 'Stirred · Spirit-forward', 'Coupe', 14,
		[['rye', '2 oz'], ['sweet-vermouth', '1 oz'], ['angostura', '2 dashes']],
		'Stir with ice. Strain into a chilled coupe.',
		'Spiced rye rounded off with vermouth. Dressed for dinner.', 'Cherry'),
	r('boulevardier', 'Boulevardier', 'Stirred · Bitter', 'Rocks', 14,
		[['bourbon', '1¼ oz'], ['campari', '1 oz'], ['sweet-vermouth', '1 oz']],
		'Stir with ice. Strain over one large cube.',
		'A Negroni that went to finishing school in Kentucky.', 'Orange peel'),
	r('mezcal-negroni', 'Mezcal Negroni', 'Stirred · Smoky', 'Rocks', 15,
		[['mezcal', '1 oz'], ['campari', '1 oz'], ['sweet-vermouth', '1 oz']],
		'Stir with ice. Strain over one large cube.',
		'The Negroni, by a campfire.', 'Orange peel'),
	r('rob-roy', 'Rob Roy', 'Stirred · Spirit-forward', 'Coupe', 14,
		[['scotch', '2 oz'], ['sweet-vermouth', '1 oz'], ['angostura', '2 dashes']],
		'Stir with ice. Strain into a chilled coupe.',
		'A Manhattan with a Highland accent.', 'Cherry'),
	r('sazerac', 'Sazerac', 'Stirred · Aromatic', 'Rocks, no ice', 15,
		[['rye', '2 oz'], ['simple', '¼ oz'], ['peychauds', '3 dashes'], ['absinthe', 'rinse']],
		'Rinse a chilled glass with absinthe. Stir the rest with ice and strain in.',
		'Rye, anise and a little ceremony.', 'Lemon peel, discarded'),
	r('americano', 'Americano', 'Built · Low-proof', 'Highball', 11,
		[['campari', '1½ oz'], ['sweet-vermouth', '1½ oz'], ['soda', 'top']],
		'Build over ice and top with soda.',
		'Bittersweet and long. An aperitif with places to be.', 'Orange slice'),
	r('daiquiri', 'Daiquiri', 'Shaken · Sour', 'Coupe', 12,
		[['white-rum', '2 oz'], ['lime', '1 oz'], ['simple', '¾ oz']],
		'Shake hard with ice. Fine strain into a chilled coupe.',
		'Rum, lime, sugar. Three ingredients and nowhere to hide.', 'Lime wheel'),
	r('margarita', 'Margarita', 'Shaken · Sour', 'Rocks', 13,
		[['tequila', '2 oz'], ['orange-liqueur', '1 oz'], ['lime', '1 oz'], ['agave', '¼ oz', 'optional']],
		'Shake with ice. Strain over fresh ice.',
		'Bright agave and lime, salted at your discretion.', 'Salt rim, lime wedge'),
	r('gimlet', 'Gimlet', 'Shaken · Sour', 'Coupe', 12,
		[['gin', '2 oz'], ['lime', '¾ oz'], ['simple', '¾ oz']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'Sharp, green and bracing.', 'Lime wheel'),
	r('southside', 'Southside', 'Shaken · Sour', 'Coupe', 13,
		[['gin', '2 oz'], ['lime', '1 oz'], ['simple', '¾ oz'], ['mint', '6 leaves']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'A gimlet that discovered the herb garden.', 'Mint leaf'),
	r('eastside', 'Eastside', 'Shaken · Sour', 'Coupe', 13,
		[['gin', '2 oz'], ['lime', '1 oz'], ['simple', '¾ oz'], ['cucumber', '3 slices'], ['mint', '6 leaves']],
		'Muddle cucumber, add the rest, shake with ice and fine strain.',
		'Cool cucumber and mint. Spa water with intent.', 'Cucumber ribbon'),
	r('whiskey-sour', 'Whiskey Sour', 'Shaken · Sour', 'Rocks', 13,
		[['bourbon', '2 oz'], ['lemon', '¾ oz'], ['simple', '¾ oz'], ['egg-white', '1', 'optional']],
		'Dry shake if using egg white, then shake with ice. Strain over fresh ice.',
		'Bourbon and lemon under a silk collar.', 'Angostura drops'),
	r('gold-rush', 'Gold Rush', 'Shaken · Sour', 'Rocks', 13,
		[['bourbon', '2 oz'], ['lemon', '¾ oz'], ['honey', '¾ oz']],
		'Shake with ice. Strain over one large cube.',
		'A whiskey sour that prefers honey. Warm and golden.', 'Lemon peel'),
	r('bees-knees', "Bee's Knees", 'Shaken · Sour', 'Coupe', 12,
		[['gin', '2 oz'], ['lemon', '¾ oz'], ['honey', '¾ oz']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'Gin, lemon and honey. Prohibition charm, without the bathtub.', 'Lemon twist'),
	r('amaretto-sour', 'Amaretto Sour', 'Shaken · Sour', 'Rocks', 12,
		[['amaretto', '2 oz'], ['lemon', '1 oz'], ['simple', '¼ oz'], ['egg-white', '1', 'optional']],
		'Dry shake if using egg white, then shake with ice. Strain over fresh ice.',
		'Marzipan and lemon, far better than you remember.', 'Lemon peel'),
	r('sidecar', 'Sidecar', 'Shaken · Sour', 'Coupe', 14,
		[['cognac', '2 oz'], ['orange-liqueur', '¾ oz'], ['lemon', '¾ oz']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'Cognac and orange, sharpened with lemon. Old money.', 'Sugar rim'),
	r('last-word', 'Last Word', 'Shaken · Herbal', 'Coupe', 15,
		[['gin', '¾ oz'], ['green-chartreuse', '¾ oz'], ['maraschino', '¾ oz'], ['lime', '¾ oz']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'Equal parts, and somehow all of them win the argument.', 'Cherry'),
	r('cosmopolitan', 'Cosmopolitan', 'Shaken · Sour', 'Coupe', 13,
		[['vodka', '1½ oz'], ['orange-liqueur', '¾ oz'], ['lime', '¾ oz'], ['cranberry', '1 oz']],
		'Shake with ice. Fine strain into a chilled coupe.',
		'Pink, tart and unapologetic.', 'Orange twist'),
	r('jungle-bird', 'Jungle Bird', 'Shaken · Tropical', 'Rocks', 14,
		[['dark-rum', '1½ oz'], ['campari', '¾ oz'], ['pineapple', '1½ oz'], ['lime', '½ oz'], ['simple', '½ oz']],
		'Shake with ice. Strain over fresh ice.',
		'Dark rum and pineapple with a bitter streak. Our kind of bird.', 'Pineapple frond'),
	r('mai-tai', 'Mai Tai', 'Shaken · Tropical', 'Rocks', 14,
		[['dark-rum', '2 oz'], ['orange-liqueur', '½ oz'], ['orgeat', '½ oz'], ['lime', '1 oz']],
		'Shake with ice. Strain over crushed ice.',
		'Rum, almond and lime. No umbrella required.', 'Mint sprig, lime shell'),
	r('pina-colada', 'Piña Colada', 'Shaken · Tropical', 'Hurricane', 13,
		[['white-rum', '2 oz'], ['pineapple', '2 oz'], ['coconut-cream', '1½ oz'], ['lime', '¼ oz', 'optional']],
		'Shake hard with crushed ice and pour without straining.',
		'Coconut and pineapple, taken entirely seriously.', 'Pineapple wedge'),
	r('espresso-martini', 'Espresso Martini', 'Shaken · Rich', 'Coupe', 14,
		[['vodka', '1½ oz'], ['coffee-liqueur', '1 oz'], ['espresso', '1 oz'], ['simple', '¼ oz', 'optional']],
		'Shake very hard with ice. Fine strain into a chilled coupe.',
		'Fresh espresso under a proper crema. Wake up, then wind down.', 'Three coffee beans'),
	r('white-russian', 'White Russian', 'Built · Rich', 'Rocks', 12,
		[['vodka', '2 oz'], ['coffee-liqueur', '1 oz'], ['cream', '1 oz']],
		'Build over ice and float the cream.',
		'Coffee and cream. The dessert you ordered instead of dessert.'),
	r('mojito', 'Mojito', 'Built · Long', 'Highball', 12,
		[['white-rum', '2 oz'], ['lime', '¾ oz'], ['simple', '¾ oz'], ['mint', '8 leaves'], ['soda', 'top']],
		'Press mint gently with syrup, add rum and lime, fill with ice and top with soda.',
		'Mint, lime and fizz. Pressed, never punished.', 'Mint sprig'),
	r('tom-collins', 'Tom Collins', 'Built · Long', 'Highball', 12,
		[['gin', '2 oz'], ['lemon', '¾ oz'], ['simple', '¾ oz'], ['soda', 'top']],
		'Shake the first three with ice, strain over fresh ice and top with soda.',
		'Sparkling gin lemonade for adults with standards.', 'Lemon wheel'),
	r('gin-tonic', 'Gin & Tonic', 'Built · Long', 'Highball', 11,
		[['gin', '2 oz'], ['tonic', '4 oz'], ['cucumber', '2 slices', 'optional']],
		'Build over plenty of ice.',
		'Two ingredients, so we fuss over both.', 'Lime wedge'),
	r('paloma', 'Paloma', 'Built · Long', 'Highball', 12,
		[['tequila', '2 oz'], ['grapefruit', '2 oz'], ['lime', '½ oz'], ['agave', '¼ oz'], ['soda', 'top']],
		'Shake all but the soda, strain over fresh ice and top.',
		'Grapefruit and tequila, long and a little salty.', 'Salt rim, grapefruit wedge'),
	r('moscow-mule', 'Moscow Mule', 'Built · Long', 'Copper mug', 12,
		[['vodka', '2 oz'], ['lime', '½ oz'], ['ginger-beer', '4 oz']],
		'Build over ice.',
		'Ginger with a kick, in the mug it insists on.', 'Lime wedge'),
	r('dark-and-stormy', 'Dark & Stormy', 'Built · Long', 'Highball', 12,
		[['dark-rum', '2 oz'], ['ginger-beer', '4 oz'], ['lime', '½ oz', 'optional']],
		'Fill a glass with ice and ginger beer, then float the rum.',
		'Dark rum over ginger. Weather you can drink.', 'Lime wedge'),
	r('cuba-libre', 'Cuba Libre', 'Built · Long', 'Highball', 10,
		[['white-rum', '2 oz'], ['cola', '4 oz'], ['lime', '½ oz']],
		'Build over ice.',
		'Rum and cola with enough lime to make it respectable.', 'Lime wedge'),
	r('tequila-sunrise', 'Tequila Sunrise', 'Built · Long', 'Highball', 11,
		[['tequila', '2 oz'], ['orange-juice', '4 oz'], ['grenadine', '½ oz']],
		'Build tequila and juice over ice, then sink the grenadine.',
		'A sunrise in a glass, without the early start.', 'Orange slice'),
	r('aperol-spritz', 'Aperol Spritz', 'Built · Sparkling', 'Wine glass', 12,
		[['aperol', '2 oz'], ['sparkling-wine', '3 oz'], ['soda', '1 oz']],
		'Build over ice in a wine glass.',
		'Orange, bubbles and a terrace state of mind.', 'Orange slice'),
	r('hugo-spritz', 'Hugo Spritz', 'Built · Sparkling', 'Wine glass', 12,
		[['elderflower', '1 oz'], ['sparkling-wine', '3 oz'], ['soda', '1 oz'], ['mint', '4 leaves']],
		'Build over ice in a wine glass.',
		'Elderflower and mint, light as an alibi.', 'Mint sprig, lime wheel'),
	r('french-75', 'French 75', 'Shaken · Sparkling', 'Flute', 14,
		[['gin', '1 oz'], ['lemon', '½ oz'], ['simple', '½ oz'], ['sparkling-wine', '3 oz']],
		'Shake the first three with ice, strain into a flute and top with sparkling wine.',
		'Gin and lemon, promoted to sparkling.', 'Lemon twist')
];

/** Colour in the glass and flavour profile for each classic. */
const LOOKS: Record<string, [color: string, profile: Profile]> = {
	martini: ['#E9E3C4', 'stirred'],
	negroni: ['#B8332A', 'bitter'],
	'old-fashioned': ['#B76A2A', 'stirred'],
	manhattan: ['#8E3A22', 'rich'],
	boulevardier: ['#9E3423', 'bitter'],
	'mezcal-negroni': ['#A8372A', 'bitter'],
	'rob-roy': ['#8E3A22', 'stirred'],
	sazerac: ['#A0522D', 'stirred'],
	americano: ['#B8432E', 'bitter'],
	daiquiri: ['#DCE3B0', 'sour'],
	margarita: ['#D9DC9A', 'sour'],
	gimlet: ['#D2DE9E', 'sour'],
	southside: ['#CFE0A8', 'sour'],
	eastside: ['#D7E8B5', 'sour'],
	'whiskey-sour': ['#E0B458', 'sour'],
	'gold-rush': ['#E3B24A', 'sour'],
	'bees-knees': ['#EDD38A', 'sour'],
	'amaretto-sour': ['#E8B04C', 'sour'],
	sidecar: ['#E0A84E', 'sour'],
	'last-word': ['#C9D77A', 'sour'],
	cosmopolitan: ['#D8597A', 'sour'],
	'jungle-bird': ['#B5412B', 'bitter'],
	'mai-tai': ['#D98A3A', 'sour'],
	'pina-colada': ['#F3EBD3', 'rich'],
	'espresso-martini': ['#4A2E1C', 'rich'],
	'white-russian': ['#CDB89A', 'rich'],
	mojito: ['#CFE0A8', 'long'],
	'tom-collins': ['#EAE6B4', 'long'],
	'gin-tonic': ['#EEF2E6', 'long'],
	paloma: ['#EFA58E', 'long'],
	'moscow-mule': ['#E6D9A6', 'long'],
	'dark-and-stormy': ['#8A5A2B', 'long'],
	'cuba-libre': ['#5A3420', 'long'],
	'tequila-sunrise': ['#F08A3C', 'long'],
	'aperol-spritz': ['#F26B2E', 'long'],
	'hugo-spritz': ['#E9EDC4', 'long'],
	'french-75': ['#F1E6B0', 'long']
};
for (const recipe of RECIPES) {
	const look = LOOKS[recipe.id];
	if (look) [recipe.color, recipe.profile] = look;
}
