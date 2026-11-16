export type Category =
	| 'spirit'
	| 'liqueur'
	| 'wine'
	| 'mixer'
	| 'juice'
	| 'syrup'
	| 'bitters'
	| 'fresh';

/** The base spirit families guests choose from, as on the website. */
export type Family = 'gin' | 'whiskey' | 'rum' | 'agave' | 'vodka' | 'brandy';

/** Flavour profiles, matching the website's "Pick a mood". */
export type Profile = 'stirred' | 'sour' | 'bitter' | 'long' | 'rich';

export interface Ingredient {
	id: string;
	name: string;
	category: Category;
	/** For spirits: which family a drink built on it belongs to. */
	family?: Family;
	/** Added by the bar. */
	custom?: boolean;
	/** A built-in ingredient the bar has renamed or moved. */
	edited?: boolean;
}

export interface RecipeIngredient {
	id: string;
	/** Measure as entered, e.g. "1½ oz", "45 ml" or "2 dashes". */
	amount: string;
	/** Optional ingredients never take a drink off the menu. */
	optional?: boolean;
}

export interface Recipe {
	id: string;
	name: string;
	/** Short descriptor shown as an eyebrow, e.g. "Stirred · Spirit-forward". */
	style: string;
	glass: string;
	method: string;
	/** Tasting note shown to guests. */
	note: string;
	garnish?: string;
	/** Suggested price, used when the drink is added to an event menu. */
	price: number;
	ingredients: RecipeIngredient[];
	/** Flavour profile shown to guests. Worked out from the style when missing. */
	profile?: Profile;
	/** Colour of the drink, as #rrggbb, for the glass on the guest menu. */
	color?: string;
	/** A house recipe the bar created. */
	custom?: boolean;
	/** A classic the bar has changed. Removing the change restores the original. */
	edited?: boolean;
}

export interface MenuItem {
	recipeId: string;
	price: number;
}

export interface BarEvent {
	id: string;
	name: string;
	/** ISO date, yyyy-mm-dd. May be empty. */
	date: string;
	items: MenuItem[];
}

/** Everything except orders. Stored as one document. */
export interface CoreState {
	rev: number;
	currency: string;
	/** Ids of ingredients currently in stock. */
	stock: string[];
	customIngredients: Ingredient[];
	customRecipes: Recipe[];
	events: BarEvent[];
	activeEventId: string | null;
}

export type Payment = 'cash' | 'digital';

export interface OrderLine {
	recipeId: string;
	name: string;
	price: number;
	qty: number;
}

export interface Order {
	id: string;
	eventId: string;
	/** ISO timestamp. */
	at: string;
	lines: OrderLine[];
	total: number;
	payment: Payment;
	voided: boolean;
}

export interface OrderInput {
	eventId: string;
	payment: Payment;
	lines: { recipeId: string; qty: number }[];
}

/** What a guest sees: only drinks that can be made right now. */
export interface PublicMenu {
	rev: number;
	currency: string;
	event: { name: string; date: string } | null;
	items: {
		id: string;
		name: string;
		style: string;
		glass: string;
		note: string;
		garnish?: string;
		method: string;
		color: string;
		profile: Profile;
		/** Base spirit family, or null for aperitifs and liqueur-led drinks. */
		spirit: Family | null;
		ingredients: { name: string; amount: string; optional?: boolean }[];
		price: number;
	}[];
}

export type Op =
	| { type: 'stock.set'; ids: string[]; inStock: boolean }
	| { type: 'ingredient.add'; id: string; name: string; category: Category; family?: Family }
	| { type: 'ingredient.update'; ingredient: Ingredient }
	| { type: 'ingredient.remove'; id: string }
	| { type: 'recipe.add'; recipe: Recipe }
	| { type: 'recipe.update'; recipe: Recipe }
	| { type: 'recipe.remove'; id: string }
	| { type: 'event.create'; id: string; name: string; date: string }
	| { type: 'event.update'; id: string; name: string; date: string }
	| { type: 'event.delete'; id: string }
	| { type: 'event.activate'; id: string | null }
	| { type: 'menu.add'; eventId: string; items: MenuItem[] }
	| { type: 'menu.remove'; eventId: string; recipeId: string }
	| { type: 'menu.price'; eventId: string; recipeId: string; price: number }
	| { type: 'currency.set'; currency: string };
