import { persisted } from './persisted.ts';

/**
 * How far the bartender has got with the order on top of the queue: which drinks are
 * made. A store, so a reload or a trip to Inventory for a fresh bottle loses nothing.
 */
export const pour = persisted<{ orderId: string; done: string[] }>('pp-pour', {
	orderId: '',
	done: []
});
