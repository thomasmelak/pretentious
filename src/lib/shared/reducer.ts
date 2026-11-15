import { CATEGORIES, INGREDIENTS, RECIPES } from './catalog.ts';
import type { CoreState, MenuItem, Op, Recipe } from './types.ts';

const text = (value: unknown, max: number): string =>
	String(value ?? '')
		.trim()
		.slice(0, max);

const price = (value: unknown): number => {
	const n = Math.round(Number(value) * 100) / 100;
	return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : 0;
};

const builtInIngredients = new Set(INGREDIENTS.map((i) => i.id));
const builtInRecipes = new Set(RECIPES.map((r) => r.id));

function cleanRecipe(input: Recipe): Recipe {
	return {
		id: text(input.id, 60),
		name: text(input.name, 80),
		style: text(input.style, 80),
		glass: text(input.glass, 40),
		method: text(input.method, 600),
		note: text(input.note, 200),
		garnish: text(input.garnish, 80) || undefined,
		price: price(input.price),
		custom: true,
		ingredients: (Array.isArray(input.ingredients) ? input.ingredients : [])
			.slice(0, 20)
			.map((i) => ({
				id: text(i.id, 60),
				amount: text(i.amount, 30),
				...(i.optional ? { optional: true } : {})
			}))
			.filter((i) => i.id)
	};
}

/**
 * Apply one bartender action to the bar's state. Pure: returns a new state and
 * throws an Error with a guest-safe message when the action makes no sense.
 * The server runs this as the source of truth; the app runs it to update instantly.
 */
export function applyOp(state: CoreState, op: Op): CoreState {
	const s: CoreState = structuredClone(state);
	const event = (id: string) => {
		const found = s.events.find((e) => e.id === id);
		if (!found) throw new Error('That event no longer exists.');
		return found;
	};

	switch (op.type) {
		case 'stock.set': {
			const stock = new Set(s.stock);
			for (const id of op.ids) {
				if (op.inStock) stock.add(text(id, 60));
				else stock.delete(id);
			}
			s.stock = [...stock];
			break;
		}
		case 'ingredient.add': {
			const id = text(op.id, 60);
			const name = text(op.name, 60);
			if (!id || !name) throw new Error('Give the ingredient a name.');
			if (!CATEGORIES.some((c) => c.id === op.category)) throw new Error('Unknown category.');
			if (builtInIngredients.has(id) || s.customIngredients.some((i) => i.id === id)) {
				throw new Error(`${name} is already in the list.`);
			}
			s.customIngredients.push({ id, name, category: op.category, custom: true });
			if (!s.stock.includes(id)) s.stock.push(id);
			break;
		}
		case 'ingredient.remove': {
			if (s.customRecipes.some((r) => r.ingredients.some((i) => i.id === op.id))) {
				throw new Error('A house recipe still uses this ingredient.');
			}
			s.customIngredients = s.customIngredients.filter((i) => i.id !== op.id);
			s.stock = s.stock.filter((id) => id !== op.id);
			break;
		}
		case 'recipe.add': {
			const recipe = cleanRecipe(op.recipe);
			if (!recipe.id || !recipe.name) throw new Error('Give the drink a name.');
			if (recipe.ingredients.length === 0) throw new Error('Add at least one ingredient.');
			if (builtInRecipes.has(recipe.id) || s.customRecipes.some((r) => r.id === recipe.id)) {
				throw new Error(`There is already a drink called ${recipe.name}.`);
			}
			s.customRecipes.push(recipe);
			break;
		}
		case 'recipe.remove': {
			s.customRecipes = s.customRecipes.filter((r) => r.id !== op.id);
			for (const e of s.events) e.items = e.items.filter((i) => i.recipeId !== op.id);
			break;
		}
		case 'event.create': {
			const id = text(op.id, 60);
			const name = text(op.name, 80);
			if (!id || !name) throw new Error('Give the event a name.');
			if (s.events.some((e) => e.id === id)) throw new Error('That event already exists.');
			s.events.push({ id, name, date: text(op.date, 10), items: [] });
			if (!s.activeEventId) s.activeEventId = id;
			break;
		}
		case 'event.update': {
			const e = event(op.id);
			const name = text(op.name, 80);
			if (!name) throw new Error('Give the event a name.');
			e.name = name;
			e.date = text(op.date, 10);
			break;
		}
		case 'event.delete': {
			s.events = s.events.filter((e) => e.id !== op.id);
			if (s.activeEventId === op.id) s.activeEventId = null;
			break;
		}
		case 'event.activate': {
			if (op.id !== null) event(op.id);
			s.activeEventId = op.id;
			break;
		}
		case 'menu.add': {
			const e = event(op.eventId);
			const known = new Set([...builtInRecipes, ...s.customRecipes.map((r) => r.id)]);
			for (const item of op.items as MenuItem[]) {
				if (!known.has(item.recipeId)) continue;
				if (e.items.some((i) => i.recipeId === item.recipeId)) continue;
				e.items.push({ recipeId: item.recipeId, price: price(item.price) });
			}
			break;
		}
		case 'menu.remove': {
			const e = event(op.eventId);
			e.items = e.items.filter((i) => i.recipeId !== op.recipeId);
			break;
		}
		case 'menu.price': {
			const item = event(op.eventId).items.find((i) => i.recipeId === op.recipeId);
			if (item) item.price = price(op.price);
			break;
		}
		case 'currency.set': {
			const code = text(op.currency, 3).toUpperCase();
			if (!/^[A-Z]{3}$/.test(code)) throw new Error('Use a three-letter currency code, like USD.');
			s.currency = code;
			break;
		}
		default:
			throw new Error('Unknown action.');
	}

	s.rev = state.rev + 1;
	return s;
}
