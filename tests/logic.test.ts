import { expect, test } from 'vitest';
import { RECIPES } from '../src/lib/shared/catalog.ts';
import { INGREDIENTS } from '../src/lib/shared/catalog.ts';
import {
	buildOrder,
	drinkCost,
	iceUse,
	menuBudget,
	pourCost,
	emptyCore,
	listNames,
	menuChanges,
	mood,
	publicMenu,
	orderNumbers,
	queue,
	roundsText,
	runningLow,
	supplies,
	queuedCounts,
	rounds,
	suggest,
	totals
} from '../src/lib/shared/logic.ts';
import { convertQuantity, countable, measures, parseQuantity, scaled, usage } from '../src/lib/shared/measure.ts';
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

test('the bartender works through waiting orders, oldest first', () => {
	const core = run([
		{ type: 'event.create', id: 'e1', name: 'Launch', date: '2026-11-20' },
		{ type: 'menu.add', eventId: 'e1', items: [{ recipeId: 'negroni', price: 12 }, { recipeId: 'martini', price: 14 }] }
	]);
	const later = buildOrder(core, { eventId: 'e1', payment: 'cash', lines: [{ recipeId: 'martini', qty: 1 }] }, 'b', '2026-11-20T21:05:00Z');
	const first = buildOrder(
		core,
		{
			eventId: 'e1',
			payment: 'digital',
			lines: [
				{ recipeId: 'negroni', qty: 2 },
				{ recipeId: 'martini', qty: 1 },
				{ recipeId: 'negroni', qty: 1 }
			]
		},
		'a',
		'2026-11-20T21:00:00Z'
	);
	assertEquals(first.status, 'waiting');
	// Orders from before the queue have no status and are not waiting.
	const legacy = { ...later, id: 'old', status: undefined };
	const voided = { ...later, id: 'v', voided: true };
	const ready = { ...later, id: 'm', status: 'ready' as const };
	const all = [later, legacy, voided, ready, first];
	const q = queue(all, 'e1');
	assertEquals(q.map((o) => o.id), ['a', 'b']);
	assertEquals(queue(all, 'e1', 'ready').map((o) => o.id), ['m']);
	assertEquals(orderNumbers([later, first]).get('a'), 1);
	assertEquals(roundsText(first), '3 Negronis and 1 Martini');
	// The same drink rung up twice in one order is made as one round.
	assertEquals(rounds(first), [
		{ recipeId: 'negroni', name: 'Negroni', qty: 3 },
		{ recipeId: 'martini', name: 'Martini', qty: 1 }
	]);
	assertEquals(Object.fromEntries(queuedCounts(q)), { negroni: 3, martini: 2 });
	assertEquals(scaled('1 oz', 3), ['3 oz', '90 ml']);
	assertEquals(scaled('22.5 ml', 2), ['45 ml', '1½ oz']);
	assertEquals(scaled('2 dashes', 3), null);
});

test('an open bar hides prices and takes no payment', () => {
	const core = run([
		{ type: 'event.create', id: 'e1', name: 'Launch', date: '' },
		{ type: 'menu.add', eventId: 'e1', items: [{ recipeId: 'negroni', price: 12 }] },
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth'], inStock: true },
		{ type: 'event.openBar', id: 'e1', open: true }
	]);
	const menu = publicMenu(core);
	assertEquals(menu.event?.openBar, true);
	assertEquals(menu.items.map((i) => i.price), [0]);
	const o = buildOrder(core, { eventId: 'e1', payment: 'cash', lines: [{ recipeId: 'negroni', qty: 2 }] }, 'a', '');
	assertEquals([o.payment, o.total, o.lines[0].price], ['open', 0, 0]);
	assertEquals(totals([o]).drinks, 2);
	assertEquals(totals([o]).total, 0);
	// Closing the open bar brings the prices back.
	const paid = applyOp(core, { type: 'event.openBar', id: 'e1', open: false });
	assertEquals(publicMenu(paid).items[0].price, 12);
	assertThrows(() => buildOrder(paid, { eventId: 'e1', payment: 'open', lines: [{ recipeId: 'negroni', qty: 1 }] }, 'b', ''));
});

test('making drinks uses up counted ingredients and warns when they run low', () => {
	assertEquals(usage('1½ oz'), { n: 45, unit: 'ml' });
	assertEquals(usage('2 dashes'), { n: 1.6, unit: 'ml' });
	assertEquals(usage('6 leaves'), { n: 6, unit: 'each' });
	assertEquals(usage('1', 'fresh'), { n: 1, unit: 'each' });
	assertEquals(usage('Top'), { n: 90, unit: 'ml' });
	let core = run([
		{ type: 'event.create', id: 'e1', name: 'Launch', date: '' },
		{ type: 'menu.add', eventId: 'e1', items: [{ recipeId: 'negroni', price: 12 }, { recipeId: 'americano', price: 10 }] },
		{ type: 'stock.set', ids: ['gin', 'campari', 'sweet-vermouth', 'soda'], inStock: true },
		// A 700 ml bottle with 300 ml left. The Americano pours 45 ml, so six of those.
		{ type: 'level.set', id: 'campari', unit: 'ml', full: 700, left: 300 }
	]);
	const event = core.events[0];
	assertEquals(supplies(core, event)[0].drinksLeft, 6);
	assertEquals(runningLow(core, event), []);
	core = applyOp(core, { type: 'pour', recipeId: 'negroni', qty: 5 });
	assertEquals(core.levels?.campari.left, 150);
	const low = runningLow(core, event);
	assertEquals(low.map((s) => [s.id, s.drinksLeft]), [['campari', 3]]);
	assertEquals(low[0].drinks.sort(), ['Americano', 'Negroni']);
	// Undo puts it back; restocking fills it up and puts it in stock.
	assertEquals(applyOp(core, { type: 'pour', recipeId: 'negroni', qty: -5 }).levels?.campari.left, 300);
	const out = applyOp(core, { type: 'stock.set', ids: ['campari'], inStock: false });
	assertEquals(runningLow(out, event), []);
	const full = applyOp(out, { type: 'level.restock', id: 'campari' });
	assertEquals([full.levels?.campari.left, full.stock.includes('campari')], [700, true]);
	// Ingredients nobody counts are left alone.
	assertEquals(applyOp(full, { type: 'pour', recipeId: 'negroni', qty: 1 }).levels, { campari: { unit: 'ml', full: 700, left: 670 } });
});

test('a bare number of a garnish is a count, not ounces', () => {
	assertEquals(countable('1', 'fresh'), true);
	assertEquals(countable('1 oz', 'fresh'), false);
	assertEquals(countable('1', 'spirit'), false);
	assertEquals(measures('1', true), ['1']);
	assertEquals(scaled('1', 3, true), null);
	const core = run([
		{ type: 'event.create', id: 'e1', name: 'Launch', date: '' },
		{ type: 'menu.add', eventId: 'e1', items: [{ recipeId: 'martini', price: 14 }] },
		{ type: 'stock.set', ids: ['gin', 'dry-vermouth'], inStock: true }
	]);
	const olives = publicMenu(core).items[0].ingredients.find((i) => i.name === 'Olives');
	assertEquals(olives?.each, true);
});

test('drink cost and menu budget come from ingredient prices', () => {
	let core = emptyCore();
	const ops: Op[] = [
		{ type: 'event.create', id: 'e1', name: 'Launch', date: '' },
		{ type: 'menu.add', eventId: 'e1', items: [{ recipeId: 'negroni', price: 12 }, { recipeId: 'americano', price: 10 }] },
		{ type: 'cost.set', id: 'gin', price: 21, size: 700, unit: 'ml' },
		{ type: 'cost.set', id: 'campari', price: 28, size: 700, unit: 'ml' },
		{ type: 'cost.set', id: 'sweet-vermouth', price: 20, size: 1000, unit: 'ml' },
		// A bag of 100 cubes for 5.
		{ type: 'cost.set', id: 'ice', price: 5, size: 100, unit: 'each' }
	];
	for (const op of ops) core = applyOp(core, op);
	const negroni = RECIPES.find((r) => r.id === 'negroni')!;
	const americano = RECIPES.find((r) => r.id === 'americano')!;
	// 30 ml each at 3, 4 and 2 cents a millilitre, plus 8 cubes of ice at 5 cents.
	assertEquals(drinkCost(core, negroni), { cost: 3.1, unpriced: [] });
	// The soda has no price yet, so it is named and left out. Built over ice: 6 cubes.
	assertEquals(drinkCost(core, americano).cost, 3);
	assertEquals(drinkCost(core, americano).unpriced.length, 1);
	assertEquals(pourCost(2.7, 12), 0.225);
	assertEquals(pourCost(2.7, 0), null);

	// 100 drinks, 50 of each: 1.5 l of gin is 3 bottles, 3.75 l of Campari 6, of vermouth 4.
	const b = menuBudget(core, core.events[0], 100);
	const buy = Object.fromEntries(b.shopping.map((p) => [p.id, [p.packs, p.spend]]));
	assertEquals(buy.gin, [3, 63]);
	assertEquals(buy.campari, [6, 168]);
	assertEquals(buy['sweet-vermouth'], [4, 80]);
	assertEquals(buy.soda, [null, null]);
	// 50 × 8 + 50 × 6 cubes is 700, so 7 bags.
	assertEquals(buy.ice, [7, 35]);
	assertEquals([b.avgCost, b.pourSpend, b.buySpend, b.takings], [3.05, 305, 346, 1100]);
	// Only the Negroni has every ingredient priced.
	assertEquals(b.priced, 1);
	// An open bar takes nothing.
	core = applyOp(core, { type: 'event.openBar', id: 'e1', open: true });
	assertEquals(menuBudget(core, core.events[0], 100).takings, 0);
	// The plan is kept on the event; clearing a price drops it from the sums.
	core = applyOp(core, { type: 'event.expect', id: 'e1', drinks: 120 });
	assertEquals(core.events[0].expect, 120);
	core = applyOp(core, { type: 'cost.clear', id: 'gin' });
	assertEquals(drinkCost(core, negroni).cost, 2.2);
	expect(() => applyOp(core, { type: 'cost.set', id: 'gin', price: 21, size: 0, unit: 'ml' })).toThrow();
});

test('ice is read from the method unless the recipe lists it', () => {
	const by = (id: string) => RECIPES.find((r) => r.id === id)!;
	// Stirred, then served on a large cube.
	assertEquals(iceUse(by('negroni')), 8);
	// Shaken and strained into a coupe.
	assertEquals(iceUse(by('daiquiri')), 6);
	// Shaken, then over fresh ice.
	assertEquals(iceUse(by('margarita')), 12);
	// Shaken with crushed ice that stays in the glass.
	assertEquals(iceUse(by('pina-colada')), 8);
	// Listed by the bar, the recipe wins.
	assertEquals(iceUse({ ...by('negroni'), ingredients: [{ id: 'ice', amount: '3 cubes' }] }), 3);

	// Counted ice comes off with each drink made, and goes back on undo.
	let core = applyOp(emptyCore(), { type: 'level.set', id: 'ice', unit: 'each', full: 200, left: 200 });
	core = applyOp(core, { type: 'pour', recipeId: 'negroni', qty: 5 });
	assertEquals(core.levels?.ice.left, 160);
	assertEquals(applyOp(core, { type: 'pour', recipeId: 'negroni', qty: -5 }).levels?.ice.left, 200);
});
