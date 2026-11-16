import { writable, type Writable } from 'svelte/store';

/**
 * A Svelte store that survives moving between screens (it lives outside any page) and,
 * on this device, a reload. Storage can be unavailable, so every access is guarded.
 */
export function persisted<T>(key: string, initial: T): Writable<T> {
	let start = initial;
	try {
		const saved = localStorage.getItem(key);
		if (saved) start = { ...initial, ...JSON.parse(saved) };
	} catch {
		// Nothing saved, or storage is off. Start fresh.
	}
	const store = writable<T>(start);
	store.subscribe((value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Private windows can refuse. The store still works for this visit.
		}
	});
	return store;
}
