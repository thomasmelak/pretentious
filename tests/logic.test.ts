import { expect, test } from 'vitest';
import { RECIPES } from '../src/lib/shared/catalog.ts';
import { INGREDIENTS } from '../src/lib/shared/catalog.ts';
import {
	buildOrder,
	emptyCore,
	listNames,
	menuChanges,
	mood,
	publicMenu,
	suggest,
	totals
} from '../src/lib/shared/logic.ts';
import { convertQuantity, measures, parseQuantity } from '../src/lib/shared/measure.ts';
import { applyOp } from '../src/lib/shared/reducer.ts';
import type { CoreState, Op } from '../src/lib/shared/types.ts';

const assertEquals = (actual: unknown, expected: unknown) => expect(actual).toEqual(expected);
const assertThrows = (fn: () => unknown) => expect(fn).toThrow();

const run = (ops: Op[], start: CoreState = emptyCore()) => ops.reduce(applyOp, start);

test('every built-in recipe uses known ingredients and unique ids', () => {
	const known = new Set(INGREDIENTS.map((i) => i.id));
	for (const r of RECIPES) {
		for (const i of r.ingredients) expect(known.has(i.id), `${r.id}: ${i.id}`).toBe(true);
	}
	assertEquals(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
	assertEquals(known.size, INGREDIENTS.length);
});

test('suggestions follow the inventory', () => {
	const s = suggest(RECIPES, ['gin', 'campari', 'sweet-vermouth', 'dry-vermouth']);
	const ready = s.ready.map((x) => x.recipe.id);
	// Martini only needs gin and dry vermouth: olives and bitters are optional.
	assertEquals(ready.sort(), ['martini', 'negroni']);
	const americano = s.oneAway.find((x) => x.recipe.id === 'americano');
	assertEquals(americano?.missing, ['soda']);
});

test('guest menu hides drinks when an ingredient runs out', () => {
	let core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth', 'lime', 'simple'], inStock: true },
		{ type: 'event.create', id: 'e1', name: 'Gallery opening', date: '2026-12-01' },
		{
			type: 'menu.add',
			eventId: 'e1',
			items: [
				{ recipeId: 'negroni', price: 12 },
				{ recipeId: 'gimlet', price: 11 },
				{ recipeId: 'daiquiri', price: 10 }
			]
		}
	]);
	assertEquals(core.activeEventId, 'e1');
	assertEquals(publicMenu(core).items.map((i) => i.id), ['negroni', 'gimlet']);

	core = applyOp(core, { type: 'stock.set', ids: ['campari'], inStock: false });
	assertEquals(publicMenu(core).items.map((i) => i.id), ['gimlet']);

	core = applyOp(core, { type: 'stock.set', ids: ['campari', 'white-rum'], inStock: true });
	assertEquals(publicMenu(core).items.map((i) => i.id), ['negroni', 'gimlet', 'daiquiri']);
});

test('each event keeps its own menu and prices', () => {
	const core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth'], inStock: true },
		{ type: 'event.create', id: 'a', name: 'A', date: '' },
		{ type: 'event.create', id: 'b', name: 'B', date: '' },
		{ type: 'menu.add', eventId: 'a', items: [{ recipeId: 'negroni', price: 12 }] },
		{ type: 'menu.add', eventId: 'b', items: [{ recipeId: 'negroni', price: 20 }] },
		{ type: 'menu.price', eventId: 'a', recipeId: 'negroni', price: 13.5 },
		{ type: 'event.activate', id: 'b' }
	]);
	assertEquals(core.events[0].items, [{ recipeId: 'negroni', price: 13.5 }]);
	assertEquals(publicMenu(core).items[0].price, 20);
	assertEquals(publicMenu(core).event?.name, 'B');
});

test('orders are priced from the menu and split by payment', () => {
	const core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth', 'lime', 'simple'], inStock: true },
		{ type: 'event.create', id: 'e1', name: 'E', date: '' },
		{
			type: 'menu.add',
			eventId: 'e1',
			items: [
				{ recipeId: 'negroni', price: 12.1 },
				{ recipeId: 'gimlet', price: 11.2 }
			]
		}
	]);
	const o1 = buildOrder(
		core,
		{ eventId: 'e1', payment: 'cash', lines: [{ recipeId: 'negroni', qty: 3 }] },
		'o1',
		'2026-12-01T20:00:00Z'
	);
	assertEquals(o1.total, 36.3);
	const o2 = buildOrder(
		core,
		{
			eventId: 'e1',
			payment: 'digital',
			lines: [
				{ recipeId: 'negroni', qty: 1 },
				{ recipeId: 'gimlet', qty: 2 }
			]
		},
		'o2',
		'2026-12-01T20:05:00Z'
	);
	assertEquals(o2.total, 34.5);
	const o3 = { ...o1, id: 'o3', voided: true };
	assertEquals(totals([o1, o2, o3]), { cash: 36.3, digital: 34.5, total: 70.8, orders: 2, drinks: 6 });

	assertThrows(() =>
		buildOrder(core, { eventId: 'e1', payment: 'cash', lines: [{ recipeId: 'mojito', qty: 1 }] }, 'x', '')
	);
	assertThrows(() => buildOrder(core, { eventId: 'e1', payment: 'cash', lines: [] }, 'x', ''));
});

test('house ingredients and recipes join the library', () => {
	const core = run([
		{ type: 'ingredient.add', id: 'tej', name: 'Tej', category: 'wine' },
		{
			type: 'recipe.add',
			recipe: {
				id: 'tej-spritz',
				name: 'Tej Spritz',
				style: 'Built',
				glass: 'Wine glass',
				method: 'Build over ice.',
				note: 'Honey wine and bubbles.',
				price: 9,
				ingredients: [
					{ id: 'tej', amount: '2 oz' },
					{ id: 'soda', amount: 'top' }
				]
			}
		},
		{ type: 'stock.set', ids: ['soda'], inStock: true },
		{ type: 'event.create', id: 'e', name: 'E', date: '' },
		{ type: 'menu.add', eventId: 'e', items: [{ recipeId: 'tej-spritz', price: 9 }] }
	]);
	assertEquals(publicMenu(core).items[0].ingredients.map((i) => i.name), ['Tej', 'Soda water']);
	assertThrows(() => applyOp(core, { type: 'ingredient.remove', id: 'tej' }));
	const removed = applyOp(core, { type: 'recipe.remove', id: 'tej-spritz' });
	assertEquals(removed.events[0].items, []);
});

test('house recipes can be edited without leaving the menu', () => {
	const recipe = {
		id: 'house-mule',
		name: 'House Mule',
		style: 'Built · Long',
		glass: 'Copper mug',
		method: 'Build over ice.',
		note: 'Ours.',
		price: 10,
		ingredients: [
			{ id: 'vodka', amount: '2 oz' },
			{ id: 'ginger-beer', amount: 'top' }
		]
	};
	let core = run([
		{ type: 'stock.set', ids: ['vodka', 'ginger-beer', 'gin'], inStock: true },
		{ type: 'recipe.add', recipe },
		{ type: 'event.create', id: 'e', name: 'E', date: '' },
		{ type: 'menu.add', eventId: 'e', items: [{ recipeId: 'house-mule', price: 11 }] }
	]);
	core = applyOp(core, {
		type: 'recipe.update',
		recipe: { ...recipe, name: 'Garden Mule', ingredients: [{ id: 'gin', amount: '2 oz' }] }
	});
	const item = publicMenu(core).items[0];
	assertEquals(
		[item.name, item.price, item.ingredients.map((i) => i.name), item.glass, item.spirit],
		['Garden Mule', 11, ['Gin'], 'Copper mug', 'gin']
	);
	assertThrows(() => applyOp(core, { type: 'recipe.update', recipe: { ...recipe, id: 'nope' } }));
});

test('menu changes and moods are worked out for guests', () => {
	const core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth', 'lime', 'simple'], inStock: true },
		{ type: 'event.create', id: 'e', name: 'E', date: '' },
		{
			type: 'menu.add',
			eventId: 'e',
			items: [
				{ recipeId: 'negroni', price: 12 },
				{ recipeId: 'gimlet', price: 11 }
			]
		}
	]);
	const before = publicMenu(core);
	assertEquals(before.items.map((i) => mood(i.style)), ['Bitter', 'Sour']);
	const after = publicMenu(applyOp(core, { type: 'stock.set', ids: ['campari'], inStock: false }));
	assertEquals(menuChanges(before, after), { gone: ['Negroni'], back: [] });
	assertEquals(menuChanges(after, before), { gone: [], back: ['Negroni'] });
	assertEquals(listNames(['A', 'B', 'C']), 'A, B and C');
	assertEquals(listNames(['A']), 'A');
});

test('amounts read in ounces or millilitres and show both', () => {
	assertEquals(
		['1½', '1 1/2', '3/4', '¾', '2', '0.75', 'dash'].map(parseQuantity),
		[1.5, 1.5, 0.75, 0.75, 2, 0.75, null]
	);
	assertEquals(measures('1½ oz'), ['1½ oz', '45 ml']);
	assertEquals(measures('1 1/2'), ['1½ oz', '45 ml']);
	assertEquals(measures('3/4'), ['¾ oz', '22.5 ml']);
	assertEquals(measures('45 ml'), ['45 ml', '1½ oz']);
	assertEquals(measures('40ml'), ['40 ml', '≈1¼ oz']);
	assertEquals(measures('2 cl'), ['20 ml', '≈¾ oz']);
	assertEquals(measures('2 dashes'), ['2 dashes']);
	assertEquals(measures('top'), ['top']);
	assertEquals(convertQuantity('1½', 'oz', 'ml'), '45');
	assertEquals(convertQuantity('22.5', 'ml', 'oz'), '¾');
});

test('drinks are grouped by base spirit and flavour profile', () => {
	const core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth', 'aperol', 'sparkling-wine', 'soda', 'espresso', 'vodka', 'coffee-liqueur'], inStock: true },
		{ type: 'event.create', id: 'e', name: 'E', date: '' },
		{
			type: 'menu.add',
			eventId: 'e',
			items: ['negroni', 'aperol-spritz', 'espresso-martini'].map((recipeId) => ({ recipeId, price: 10 }))
		}
	]);
	const items = publicMenu(core).items.map((i) => [i.id, i.spirit, i.profile, i.color]);
	assertEquals(items, [
		['negroni', 'gin', 'bitter', '#B8332A'],
		['aperol-spritz', null, 'long', '#F26B2E'],
		['espresso-martini', 'vodka', 'rich', '#4A2E1C']
	]);
});

test('classics and built-in ingredients can be edited and restored', () => {
	let core = run([
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth'], inStock: true },
		{ type: 'event.create', id: 'e', name: 'E', date: '' },
		{ type: 'menu.add', eventId: 'e', items: [{ recipeId: 'negroni', price: 12 }] }
	]);
	const negroni = RECIPES.find((r) => r.id === 'negroni')!;
	core = applyOp(core, {
		type: 'recipe.update',
		recipe: { ...negroni, name: 'Peacock Negroni', color: '#aa2233', profile: 'stirred' }
	});
	let item = publicMenu(core).items[0];
	assertEquals([item.name, item.color, item.profile], ['Peacock Negroni', '#AA2233', 'stirred']);
	assertEquals(core.customRecipes[0].edited, true);

	core = applyOp(core, {
		type: 'ingredient.update',
		ingredient: { id: 'gin', name: 'Peacock Dry Gin', category: 'spirit', family: 'gin' }
	});
	assertEquals(publicMenu(core).items[0].ingredients[0].name, 'Peacock Dry Gin');

	core = applyOp(core, { type: 'recipe.remove', id: 'negroni' });
	core = applyOp(core, { type: 'ingredient.remove', id: 'gin' });
	item = publicMenu(core).items[0];
	assertEquals([item.name, item.ingredients[0].name], ['Negroni', 'Gin']);
	assertEquals(core.stock.includes('gin'), true);

	core = applyOp(core, { type: 'ingredient.add', id: 'olmeca', name: 'Olmeca Chocolate', category: 'liqueur' });
	core = applyOp(core, {
		type: 'ingredient.update',
		ingredient: { id: 'olmeca', name: 'Olmeca Chocolate', category: 'spirit', family: 'agave' }
	});
	assertEquals(core.customIngredients.find((i) => i.id === 'olmeca')?.family, 'agave');
});
