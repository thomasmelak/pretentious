import { api, ApiError } from './api.ts';
import {
	activeEvent,
	allIngredients,
	allRecipes,
	emptyCore,
	ingredientNames,
	suggest
} from './shared/logic.ts';
import { applyOp } from './shared/reducer.ts';
import type { CoreState, Op, Order, OrderInput } from './shared/types.ts';

const PIN_KEY = 'pp-bar-pin';
const POLL_MS = 10_000;

/** The bartender's view of the bar: state from the API, updated optimistically. */
class Bar {
	status = $state<'loading' | 'signed-out' | 'ready'>('loading');
	core = $state<CoreState>(emptyCore());
	orders = $state<Order[]>([]);
	error = $state('');

	ingredients = $derived(allIngredients(this.core));
	recipes = $derived(allRecipes(this.core));
	names = $derived(ingredientNames(this.core));
	active = $derived(activeEvent(this.core));
	suggestions = $derived(suggest(this.recipes, this.core.stock));

	#pin = '';
	#pending = 0;
	#timer: ReturnType<typeof setInterval> | undefined;
	#started = false;

	/** Restore a saved sign-in. Safe to call more than once. */
	async start() {
		if (this.#started) return;
		this.#started = true;
		const saved = localStorage.getItem(PIN_KEY);
		if (!saved) {
			this.status = 'signed-out';
			return;
		}
		this.#pin = saved;
		try {
			await this.refresh();
			this.#ready();
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) this.signOut();
			else {
				this.status = 'signed-out';
				this.error = message(err);
			}
		}
	}

	async signIn(pin: string) {
		await api.login(pin);
		this.#pin = pin;
		localStorage.setItem(PIN_KEY, pin);
		await this.refresh();
		this.#ready();
	}

	signOut() {
		this.#pin = '';
		localStorage.removeItem(PIN_KEY);
		clearInterval(this.#timer);
		this.status = 'signed-out';
		this.core = emptyCore();
		this.orders = [];
	}

	#ready() {
		this.status = 'ready';
		this.error = '';
		clearInterval(this.#timer);
		// Pick up changes made on other devices.
		this.#timer = setInterval(() => {
			if (document.visibilityState === 'visible' && this.#pending === 0) {
				this.refresh().catch(() => {});
			}
		}, POLL_MS);
	}

	async refresh() {
		const { core, orders } = await api.state(this.#pin);
		if (this.#pending > 0) return;
		this.core = core;
		this.orders = orders;
	}

	/** Apply a change straight away, then confirm it with the server. */
	async dispatch(op: Op): Promise<boolean> {
		let next: CoreState;
		try {
			next = applyOp($state.snapshot(this.core) as CoreState, op);
		} catch (err) {
			this.error = message(err);
			return false;
		}
		this.core = next;
		this.error = '';
		this.#pending++;
		try {
			const { core } = await api.op(this.#pin, op);
			this.#pending--;
			if (this.#pending === 0) this.core = core;
			return true;
		} catch (err) {
			this.#pending--;
			await this.#recover(err);
			return false;
		}
	}

	async placeOrder(input: OrderInput): Promise<boolean> {
		try {
			const { order } = await api.order(this.#pin, input);
			this.orders = [order, ...this.orders];
			this.error = '';
			return true;
		} catch (err) {
			await this.#recover(err);
			return false;
		}
	}

	async setVoided(order: Order, voided: boolean) {
		try {
			const res = await api.voidOrder(this.#pin, order.eventId, order.id, voided);
			this.orders = this.orders.map((o) => (o.id === order.id ? res.order : o));
		} catch (err) {
			await this.#recover(err);
		}
	}

	async #recover(err: unknown) {
		if (err instanceof ApiError && err.status === 401) {
			this.signOut();
			return;
		}
		this.error = message(err);
		// Throw away the optimistic change and show what the server has.
		if (this.#pending === 0) await this.refresh().catch(() => {});
	}
}

const message = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');

export const bar = new Bar();
