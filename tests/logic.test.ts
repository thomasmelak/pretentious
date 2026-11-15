import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { RECIPES } from '../src/lib/shared/catalog.ts';
import { INGREDIENTS } from '../src/lib/shared/catalog.ts';
import { buildOrder, emptyCore, publicMenu, suggest, totals } from '../src/lib/shared/logic.ts';
import { applyOp } from '../src/lib/shared/reducer.ts';
import type { CoreState, Op } from '../src/lib/shared/types.ts';

const run = (ops: Op[], start: CoreState = emptyCore()) => ops.reduce(applyOp, start);

Deno.test('every built-in recipe uses known ingredients and unique ids', () => {
	const known = new Set(INGREDIENTS.map((i) => i.id));
	for (const r of RECIPES) {
		for (const i of r.ingredients) assertEquals(known.has(i.id), true, `${r.id}: ${i.id}`);
	}
	assertEquals(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
	assertEquals(known.size, INGREDIENTS.length);
});

Deno.test('suggestions follow the inventory', () => {
	const s = suggest(RECIPES, ['gin', 'campari', 'sweet-vermouth', 'dry-vermouth']);
	const ready = s.ready.map((x) => x.recipe.id);
	// Martini only needs gin and dry vermouth: olives and bitters are optional.
	assertEquals(ready.sort(), ['martini', 'negroni']);
	const americano = s.oneAway.find((x) => x.recipe.id === 'americano');
	assertEquals(americano?.missing, ['soda']);
});

Deno.test('guest menu hides drinks when an ingredient runs out', () => {
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

Deno.test('each event keeps its own menu and prices', () => {
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

Deno.test('orders are priced from the menu and split by payment', () => {
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

Deno.test('house ingredients and recipes join the library', () => {
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
	assertEquals(publicMenu(core).items[0].ingredients, ['Tej', 'Soda water']);
	assertThrows(() => applyOp(core, { type: 'ingredient.remove', id: 'tej' }));
	const removed = applyOp(core, { type: 'recipe.remove', id: 'tej-spritz' });
	assertEquals(removed.events[0].items, []);
});
