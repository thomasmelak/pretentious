import { INGREDIENTS, RECIPES } from './catalog.ts';
import type {
	BarEvent,
	CoreState,
	Ingredient,
	Order,
	OrderInput,
	PublicMenu,
	Recipe
} from './types.ts';

export function emptyCore(): CoreState {
	return {
		rev: 0,
		currency: 'USD',
		stock: [],
		customIngredients: [],
		customRecipes: [],
		events: [],
		activeEventId: null
	};
}

export const allIngredients = (core: CoreState): Ingredient[] => [
	...INGREDIENTS,
	...core.customIngredients
];

export const allRecipes = (core: CoreState): Recipe[] => [...RECIPES, ...core.customRecipes];

export function ingredientNames(core: CoreState): Map<string, string> {
	return new Map(allIngredients(core).map((i) => [i.id, i.name]));
}

/** Ids of required ingredients that are not in stock. */
export function missing(recipe: Recipe, stock: Set<string>): string[] {
	return recipe.ingredients.filter((i) => !i.optional && !stock.has(i.id)).map((i) => i.id);
}

export interface Suggestion {
	recipe: Recipe;
	missing: string[];
}

/** Sort every recipe into what can be poured now, what is one ingredient away, and the rest. */
export function suggest(recipes: Recipe[], stockIds: string[]) {
	const stock = new Set(stockIds);
	const ready: Suggestion[] = [];
	const oneAway: Suggestion[] = [];
	const rest: Suggestion[] = [];
	for (const recipe of recipes) {
		const m = missing(recipe, stock);
		(m.length === 0 ? ready : m.length === 1 ? oneAway : rest).push({ recipe, missing: m });
	}
	rest.sort((a, b) => a.missing.length - b.missing.length);
	return { ready, oneAway, rest };
}

export interface MenuRow {
	recipe: Recipe;
	price: number;
	missing: string[];
	available: boolean;
}

/** An event's menu with availability worked out from the current stock. */
export function menuRows(core: CoreState, event: BarEvent): MenuRow[] {
	const stock = new Set(core.stock);
	const byId = new Map(allRecipes(core).map((r) => [r.id, r]));
	const rows: MenuRow[] = [];
	for (const item of event.items) {
		const recipe = byId.get(item.recipeId);
		if (!recipe) continue;
		const m = missing(recipe, stock);
		rows.push({ recipe, price: item.price, missing: m, available: m.length === 0 });
	}
	return rows;
}

export const activeEvent = (core: CoreState): BarEvent | null =>
	core.events.find((e) => e.id === core.activeEventId) ?? null;

/** The guest menu: the active event's drinks, minus anything that cannot be made right now. */
export function publicMenu(core: CoreState): PublicMenu {
	const event = activeEvent(core);
	const names = ingredientNames(core);
	return {
		rev: core.rev,
		currency: core.currency,
		event: event ? { name: event.name, date: event.date } : null,
		items: event
			? menuRows(core, event)
					.filter((row) => row.available)
					.map(({ recipe, price }) => ({
						id: recipe.id,
						name: recipe.name,
						style: recipe.style,
						note: recipe.note,
						ingredients: recipe.ingredients
							.filter((i) => !i.optional)
							.map((i) => names.get(i.id) ?? i.id),
						price
					}))
			: []
	};
}

const cents = (n: number) => Math.round(n * 100);

/** Price an order from the event's menu, so totals never depend on what the client sent. */
export function buildOrder(core: CoreState, input: OrderInput, id: string, at: string): Order {
	const event = core.events.find((e) => e.id === input.eventId);
	if (!event) throw new Error('That event no longer exists.');
	if (input.payment !== 'cash' && input.payment !== 'digital') {
		throw new Error('Payment must be cash or digital.');
	}
	const rows = new Map(menuRows(core, event).map((row) => [row.recipe.id, row]));
	const lines = [];
	let total = 0;
	for (const line of input.lines ?? []) {
		const qty = Math.floor(Number(line.qty));
		if (!(qty > 0) || qty > 99) continue;
		const row = rows.get(line.recipeId);
		if (!row) throw new Error('A drink in this order is not on the menu.');
		lines.push({ recipeId: row.recipe.id, name: row.recipe.name, price: row.price, qty });
		total += cents(row.price) * qty;
	}
	if (lines.length === 0) throw new Error('The order is empty.');
	return {
		id,
		eventId: event.id,
		at,
		lines,
		total: total / 100,
		payment: input.payment,
		voided: false
	};
}

export interface Totals {
	cash: number;
	digital: number;
	total: number;
	orders: number;
	drinks: number;
}

/** Cash, digital and overall takings. Voided orders are ignored. */
export function totals(orders: Order[]): Totals {
	let cash = 0;
	let digital = 0;
	let count = 0;
	let drinks = 0;
	for (const o of orders) {
		if (o.voided) continue;
		count++;
		drinks += o.lines.reduce((n, l) => n + l.qty, 0);
		if (o.payment === 'cash') cash += cents(o.total);
		else digital += cents(o.total);
	}
	return {
		cash: cash / 100,
		digital: digital / 100,
		total: (cash + digital) / 100,
		orders: count,
		drinks
	};
}

export function slug(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
}
