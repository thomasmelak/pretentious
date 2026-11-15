export type Category =
	| 'spirit'
	| 'liqueur'
	| 'wine'
	| 'mixer'
	| 'juice'
	| 'syrup'
	| 'bitters'
	| 'fresh';

export interface Ingredient {
	id: string;
	name: string;
	category: Category;
	custom?: boolean;
}

export interface RecipeIngredient {
	id: string;
	/** Free text measure, e.g. "2 oz" or "2 dashes". */
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
	custom?: boolean;
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
		note: string;
		ingredients: string[];
		price: number;
	}[];
}

export type Op =
	| { type: 'stock.set'; ids: string[]; inStock: boolean }
	| { type: 'ingredient.add'; id: string; name: string; category: Category }
	| { type: 'ingredient.remove'; id: string }
	| { type: 'recipe.add'; recipe: Recipe }
	| { type: 'recipe.remove'; id: string }
	| { type: 'event.create'; id: string; name: string; date: string }
	| { type: 'event.update'; id: string; name: string; date: string }
	| { type: 'event.delete'; id: string }
	| { type: 'event.activate'; id: string | null }
	| { type: 'menu.add'; eventId: string; items: MenuItem[] }
	| { type: 'menu.remove'; eventId: string; recipeId: string }
	| { type: 'menu.price'; eventId: string; recipeId: string; price: number }
	| { type: 'currency.set'; currency: string };
