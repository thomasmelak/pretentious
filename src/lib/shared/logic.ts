import { INGREDIENTS, PROFILES, RECIPES } from './catalog.ts';
import { countable, usage } from './measure.ts';
import type {
	BarEvent,
	CoreState,
	Family,
	Ingredient,
	Order,
	OrderInput,
	OrderStatus,
	Profile,
	PublicMenu,
	Level,
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

/**
 * Built-ins first, in their usual order, each replaced by the bar's edited version when
 * there is one; then the bar's own additions.
 */
function merge<T extends { id: string }>(builtIn: T[], mine: T[]): T[] {
	const byId = new Map(mine.map((x) => [x.id, x]));
	const builtInIds = new Set(builtIn.map((x) => x.id));
	return [...builtIn.map((x) => byId.get(x.id) ?? x), ...mine.filter((x) => !builtInIds.has(x.id))];
}

export const allIngredients = (core: CoreState): Ingredient[] =>
	merge(INGREDIENTS, core.customIngredients);

export const allRecipes = (core: CoreState): Recipe[] => merge(RECIPES, core.customRecipes);

/** The family of the first required ingredient that has one: a Negroni is a gin drink. */
export function spiritOf(recipe: Recipe, ingredients: Map<string, Ingredient>): Family | null {
	for (const i of recipe.ingredients) {
		if (i.optional) continue;
		const family = ingredients.get(i.id)?.family;
		if (family) return family;
	}
	return null;
}

/** A recipe's flavour profile, worked out from its style when it was never set. */
export function profileOf(recipe: Pick<Recipe, 'profile' | 'style'>): Profile {
	if (recipe.profile && PROFILES.some((p) => p.id === recipe.profile)) return recipe.profile;
	const style = recipe.style.toLowerCase();
	if (/bitter/.test(style)) return 'bitter';
	if (/sour|tart|citrus/.test(style)) return 'sour';
	if (/long|fizz|sparkling|highball|spritz/.test(style)) return 'long';
	if (/rich|sweet|cream|dessert|coffee|tropical/.test(style)) return 'rich';
	return 'stirred';
}

/** A neutral gold for drinks that were given no colour. */
export const DEFAULT_COLOR = '#E2B988';

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

export interface Supply {
	id: string;
	name: string;
	level: Level;
	/** Drinks left at the biggest pour on the menu that uses it; null when nothing on it does. */
	drinksLeft: number | null;
	/** Drinks on the menu that need it. */
	drinks: string[];
}

/** Drinks a level is warned about at: "about 5 drinks away from running out". */
export const LOW_AT = 5;

/** Every counted ingredient, with how many drinks it has left on this event's menu. */
export function supplies(core: CoreState, event: BarEvent | null): Supply[] {
	if (!core.levels) return [];
	const ingredients = new Map(allIngredients(core).map((i) => [i.id, i]));
	const rows = event ? menuRows(core, event) : [];
	const out: Supply[] = [];
	for (const [id, level] of Object.entries(core.levels)) {
		const ingredient = ingredients.get(id);
		if (!ingredient) continue;
		let most = 0;
		const drinks: string[] = [];
		for (const row of rows) {
			const line = row.recipe.ingredients.find((i) => i.id === id && !i.optional);
			const use = line && usage(line.amount, ingredient.category);
			if (!use || use.unit !== level.unit) continue;
			drinks.push(row.recipe.name);
			most = Math.max(most, use.n);
		}
		const left = Math.max(0, level.left);
		out.push({
			id,
			name: ingredient.name,
			level,
			drinksLeft: most ? Math.floor(left / most + 1e-9) : null,
			drinks
		});
	}
	return out.sort((a, b) => (a.drinksLeft ?? 1e9) - (b.drinksLeft ?? 1e9) || a.name.localeCompare(b.name));
}

/** In stock, but enough for only a handful more drinks on tonight's menu. */
export const runningLow = (core: CoreState, event: BarEvent | null): Supply[] =>
	supplies(core, event).filter(
		(s) => s.drinksLeft !== null && s.drinksLeft <= LOW_AT && core.stock.includes(s.id)
	);

export const activeEvent = (core: CoreState): BarEvent | null =>
	core.events.find((e) => e.id === core.activeEventId) ?? null;

/** The guest menu: the active event's drinks, minus anything that cannot be made right now. */
export function publicMenu(core: CoreState): PublicMenu {
	const event = activeEvent(core);
	const ingredients = new Map(allIngredients(core).map((i) => [i.id, i]));
	return {
		rev: core.rev,
		currency: core.currency,
		event: event ? { name: event.name, date: event.date, ...(event.openBar ? { openBar: true } : {}) } : null,
		items: event
			? menuRows(core, event)
					.filter((row) => row.available)
					.map(({ recipe, price }) => ({
						id: recipe.id,
						name: recipe.name,
						style: recipe.style,
						glass: recipe.glass,
						note: recipe.note,
						garnish: recipe.garnish,
						method: recipe.method,
						color: recipe.color || DEFAULT_COLOR,
						profile: profileOf(recipe),
						spirit: spiritOf(recipe, ingredients),
						ingredients: recipe.ingredients.map((i) => ({
							name: ingredients.get(i.id)?.name ?? i.id,
							amount: i.amount,
							...(countable(i.amount, ingredients.get(i.id)?.category) ? { each: true } : {}),
							...(i.optional ? { optional: true } : {})
						})),
						// At an open bar the prices stay behind the bar.
						price: event.openBar ? 0 : price
					}))
			: []
	};
}

const cents = (n: number) => Math.round(n * 100);

/** Price an order from the event's menu, so totals never depend on what the client sent. */
export function buildOrder(core: CoreState, input: OrderInput, id: string, at: string): Order {
	const event = core.events.find((e) => e.id === input.eventId);
	if (!event) throw new Error('That event no longer exists.');
	// An open bar takes no payment, whatever the till sent.
	const payment = event.openBar ? 'open' : input.payment;
	if (payment !== 'cash' && payment !== 'digital') {
		if (payment !== 'open') throw new Error('Payment must be cash or digital.');
		if (!event.openBar) throw new Error('This event is not an open bar.');
	}
	const rows = new Map(menuRows(core, event).map((row) => [row.recipe.id, row]));
	const lines = [];
	let total = 0;
	for (const line of input.lines ?? []) {
		const qty = Math.floor(Number(line.qty));
		if (!(qty > 0) || qty > 99) continue;
		const row = rows.get(line.recipeId);
		if (!row) throw new Error('A drink in this order is not on the menu.');
		const price = payment === 'open' ? 0 : row.price;
		lines.push({ recipeId: row.recipe.id, name: row.recipe.name, price, qty });
		total += cents(price) * qty;
	}
	if (lines.length === 0) throw new Error('The order is empty.');
	return {
		id,
		eventId: event.id,
		at,
		lines,
		total: total / 100,
		payment,
		voided: false,
		status: 'waiting'
	};
}

/** Orders taken before the queue existed have no status: they were served long ago. */
export const statusOf = (order: Order): OrderStatus => order.status ?? 'served';

/** An event's orders in one status, oldest first: the bartender works from the top. */
export function queue(orders: Order[], eventId: string | null, status: OrderStatus = 'waiting'): Order[] {
	return orders
		.filter((o) => o.eventId === eventId && !o.voided && statusOf(o) === status)
		.sort((a, b) => a.at.localeCompare(b.at));
}

/** Orders are numbered through the night, so the bartender can call "number 14". */
export function orderNumbers(orders: Order[]): Map<string, number> {
	const byEvent = new Map<string, Order[]>();
	for (const o of orders) byEvent.set(o.eventId, [...(byEvent.get(o.eventId) ?? []), o]);
	const numbers = new Map<string, number>();
	for (const list of byEvent.values()) {
		list.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
		list.forEach((o, i) => numbers.set(o.id, i + 1));
	}
	return numbers;
}

/** "5 Negronis and 6 Boulevardiers". */
export function roundsText(order: Order): string {
	return listNames(rounds(order).map((r) => countName(r.qty, r.name)));
}

/** "1 Negroni", "3 Negronis". */
export const countName = (qty: number, name: string) => `${qty} ${qty === 1 ? name : plural(name)}`;

const plural = (name: string) => (/(s|x|z|ch|sh)$/i.test(name) ? name : /[^aeiou]y$/i.test(name) ? `${name.slice(0, -1)}ies` : `${name}s`);

export interface Round {
	recipeId: string;
	name: string;
	qty: number;
}

/** What to make for an order: one row per drink, however many times it was rung up. */
export function rounds(order: Order): Round[] {
	const byId = new Map<string, Round>();
	for (const line of order.lines) {
		const round = byId.get(line.recipeId);
		if (round) round.qty += line.qty;
		else byId.set(line.recipeId, { recipeId: line.recipeId, name: line.name, qty: line.qty });
	}
	return [...byId.values()];
}

/** How many of each drink are still to be made across the queue. */
export function queuedCounts(orders: Order[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const order of orders) {
		for (const line of order.lines) counts.set(line.recipeId, (counts.get(line.recipeId) ?? 0) + line.qty);
	}
	return counts;
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
		else if (o.payment === 'digital') digital += cents(o.total);
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

/** "Stirred · Bitter" reads as a technique and a mood. Guests browse by mood. */
export function mood(style: string): string {
	const parts = style.split('·').map((part) => part.trim());
	return parts[parts.length - 1] || 'House';
}

/** What changed between two versions of the guest menu, by drink. */
export function menuChanges(before: PublicMenu, after: PublicMenu) {
	const was = new Map(before.items.map((i) => [i.id, i.name]));
	const now = new Map(after.items.map((i) => [i.id, i.name]));
	return {
		gone: [...was].filter(([id]) => !now.has(id)).map(([, name]) => name),
		back: [...now].filter(([id]) => !was.has(id)).map(([, name]) => name)
	};
}

/** "Negroni", "Negroni and Mojito", "Negroni, Mojito and Gimlet". */
export function listNames(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** What one drink of a recipe costs the bar to pour. */
export interface DrinkCost {
	/** Cost of the ingredients that have a price. */
	cost: number;
	/** Ingredients with no price, or no measure to price, so `cost` is short by them. */
	unpriced: string[];
}

/** One pour's worth of each priced ingredient, optional ones included, since they usually go in. */
export function drinkCost(core: CoreState, recipe: Recipe): DrinkCost {
	const ingredients = new Map(allIngredients(core).map((i) => [i.id, i]));
	let cost = 0;
	const unpriced: string[] = [];
	for (const line of recipe.ingredients) {
		const ingredient = ingredients.get(line.id);
		const price = core.costs?.[line.id];
		const use = usage(line.amount, ingredient?.category);
		if (price && use && use.unit === price.unit) cost += (price.price / price.size) * use.n;
		else unpriced.push(ingredient?.name ?? line.id);
	}
	return { cost: Math.round(cost * 100) / 100, unpriced };
}

/** Cost as a share of the price, the bar trade's "pour cost": 0.2 is 20%. Null when free. */
export const pourCost = (cost: number, price: number): number | null => (price > 0 ? cost / price : null);

export interface Purchase {
	id: string;
	name: string;
	unit: 'ml' | 'each';
	/** How much the planned drinks use. */
	need: number;
	/** Whole bottles or packs to buy, when there is a price. */
	packs: number | null;
	size: number | null;
	spend: number | null;
}

export interface Budget {
	/** Drinks planned, spread evenly over the menu. */
	drinks: number;
	/** Average across the menu, one of each drink. */
	avgCost: number;
	avgPrice: number;
	/** Cost of what the planned drinks pour. */
	pourSpend: number;
	/** Cost of the whole bottles to buy for them. */
	buySpend: number;
	/** Takings if the drinks sell at menu prices; 0 at an open bar. */
	takings: number;
	shopping: Purchase[];
	/** Drinks on the menu with every ingredient priced. */
	priced: number;
	/** Ingredients without a price, so the totals leave them out. */
	unpriced: string[];
}

/** What an event's menu costs for a number of drinks, spread evenly over it, and what to buy. */
export function menuBudget(core: CoreState, event: BarEvent, drinks: number): Budget {
	const rows = menuRows(core, event);
	const ingredients = new Map(allIngredients(core).map((i) => [i.id, i]));
	const each = rows.length ? drinks / rows.length : 0;
	const need = new Map<string, { unit: 'ml' | 'each'; n: number }>();
	const unpriced = new Set<string>();
	let costSum = 0;
	let priceSum = 0;
	let priced = 0;
	for (const row of rows) {
		const c = drinkCost(core, row.recipe);
		costSum += c.cost;
		if (!c.unpriced.length) priced++;
		priceSum += row.price;
		c.unpriced.forEach((n) => unpriced.add(n));
		for (const line of row.recipe.ingredients) {
			const use = usage(line.amount, ingredients.get(line.id)?.category);
			if (!use) continue;
			const key = `${line.id}|${use.unit}`;
			const was = need.get(key) ?? { unit: use.unit, n: 0 };
			was.n += use.n * each;
			need.set(key, was);
		}
	}
	const shopping: Purchase[] = [];
	for (const [key, { unit, n }] of need) {
		const id = key.split('|')[0];
		const price = core.costs?.[id];
		const priced = price && price.unit === unit;
		const packs = priced ? Math.ceil(n / price.size - 1e-9) : null;
		shopping.push({
			id,
			name: ingredients.get(id)?.name ?? id,
			unit,
			need: Math.round(n * 10) / 10,
			packs,
			size: priced ? price.size : null,
			spend: priced && packs !== null ? Math.round(packs * price.price * 100) / 100 : null
		});
	}
	shopping.sort((a, b) => (b.spend ?? -1) - (a.spend ?? -1) || a.name.localeCompare(b.name));
	const avgCost = rows.length ? costSum / rows.length : 0;
	const avgPrice = rows.length ? priceSum / rows.length : 0;
	const round = (n: number) => Math.round(n * 100) / 100;
	return {
		drinks,
		avgCost: round(avgCost),
		avgPrice: round(avgPrice),
		pourSpend: round(avgCost * drinks),
		buySpend: round(shopping.reduce((sum, p) => sum + (p.spend ?? 0), 0)),
		takings: event.openBar ? 0 : round(avgPrice * drinks),
		shopping,
		priced,
		unpriced: [...unpriced].sort()
	};
}
