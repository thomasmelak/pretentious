import { persisted } from './persisted.ts';

/**
 * The order being rung up at the till. A store, so walking off to restock or fix a recipe
 * does not lose it.
 */
export const ticket = persisted<{ eventId: string | null; lines: Record<string, number> }>(
	'pp-ticket',
	{ eventId: null, lines: {} }
);

export function clearTicket() {
	ticket.set({ eventId: null, lines: {} });
}
