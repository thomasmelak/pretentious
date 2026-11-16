import { get } from 'svelte/store';
import { slug } from '../shared/logic.ts';
import type { Profile, Recipe } from '../shared/types.ts';
import { persisted } from './persisted.ts';

export type Technique = 'Shaken' | 'Stirred' | 'Built' | 'Blended';
export const TECHNIQUES: Technique[] = ['Shaken', 'Stirred', 'Built', 'Blended'];

export interface DraftRow {
	id: string;
	amount: string;
	optional: boolean;
}

export interface Draft {
	name: string;
	technique: Technique;
	profile: Profile | null;
	price: number;
	rows: DraftRow[];
	glass: string;
	color: string;
	garnish: string;
	note: string;
	method: string;
}

export interface WizardState {
	open: boolean;
	/** Id of the recipe being edited, or null for a new one. */
	editing: string | null;
	/** Name of that recipe when editing started, for headings. */
	editingName: string;
	step: number;
	draft: Draft;
}

export const STEPS = ['The idea', 'Ingredients', 'Glass & colour', 'The story'] as const;

const blank = (): Draft => ({
	name: '',
	technique: 'Shaken',
	profile: null,
	price: 12,
	rows: [],
	glass: '',
	color: '#E2B988',
	garnish: '',
	note: '',
	method: ''
});

const closed = (): WizardState => ({
	open: false,
	editing: null,
	editingName: '',
	step: 0,
	draft: blank()
});

/**
 * The recipe being written. It is a store rather than component state so that it stays
 * put while the bartender goes off to stock a new ingredient or ring up an order.
 */
export const wizard = persisted<WizardState>('pp-recipe-wizard', closed());

/** True when the draft holds anything worth keeping. */
export function hasWork(state: WizardState = get(wizard)): boolean {
	const d = state.draft;
	return state.open && (d.name.trim() !== '' || d.rows.length > 0 || d.note.trim() !== '');
}

export function startNew() {
	wizard.set({ ...closed(), open: true });
}

export function startEdit(recipe: Recipe) {
	const technique =
		TECHNIQUES.find((t) => recipe.style.toLowerCase().includes(t.toLowerCase())) ?? 'Shaken';
	wizard.set({
		open: true,
		editing: recipe.id,
		editingName: recipe.name,
		step: 0,
		draft: {
			name: recipe.name,
			technique,
			profile: recipe.profile ?? null,
			price: recipe.price,
			rows: recipe.ingredients.map((i) => ({
				id: i.id,
				amount: i.amount,
				optional: Boolean(i.optional)
			})),
			glass: recipe.glass,
			color: recipe.color ?? '#E2B988',
			garnish: recipe.garnish ?? '',
			note: recipe.note,
			method: recipe.method
		}
	});
}

export function close() {
	wizard.set(closed());
}

export function goTo(step: number) {
	wizard.update((w) => ({ ...w, step: Math.max(0, Math.min(STEPS.length - 1, step)) }));
}

export function toggleIngredient(id: string) {
	wizard.update((w) => {
		const has = w.draft.rows.some((r) => r.id === id);
		const rows = has
			? w.draft.rows.filter((r) => r.id !== id)
			: [...w.draft.rows, { id, amount: '', optional: false }];
		return { ...w, draft: { ...w.draft, rows } };
	});
}

/** Put a newly stocked ingredient into the draft, if it is not there already. */
export function useIngredient(id: string) {
	if (!get(wizard).draft.rows.some((r) => r.id === id)) toggleIngredient(id);
}

/** The recipe the draft describes. */
export function toRecipe(state: WizardState): Recipe {
	const d = state.draft;
	const profileWord: Record<Profile, string> = {
		stirred: 'Spirit-forward',
		sour: 'Sour',
		bitter: 'Bitter',
		long: 'Long',
		rich: 'Rich'
	};
	return {
		id: state.editing ?? slug(d.name),
		name: d.name.trim(),
		style: d.profile ? `${d.technique} · ${profileWord[d.profile]}` : d.technique,
		profile: d.profile ?? undefined,
		glass: d.glass,
		color: d.color,
		garnish: d.garnish.trim() || undefined,
		note: d.note.trim(),
		method: d.method.trim(),
		price: Number(d.price) || 0,
		ingredients: d.rows.map((r) => ({
			id: r.id,
			amount: r.amount.trim(),
			...(r.optional ? { optional: true } : {})
		}))
	};
}

/** What still stops the draft from being saved, step by step. */
export function problems(state: WizardState): Record<number, string> {
	const d = state.draft;
	const out: Record<number, string> = {};
	if (!d.name.trim()) out[0] = 'Give the drink a name.';
	else if (!d.profile) out[0] = 'Choose a flavour profile.';
	if (d.rows.length === 0) out[1] = 'Choose at least one ingredient.';
	if (!d.glass) out[2] = 'Choose a glass.';
	return out;
}
