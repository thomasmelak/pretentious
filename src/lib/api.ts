import type { CoreState, Op, Order, OrderInput, PublicMenu } from './shared/types.ts';

/** Where the API lives. Empty means "same origin" (dev proxy or single-server hosting). */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

async function call<T>(path: string, init: { pin?: string; body?: unknown } = {}): Promise<T> {
	let res: Response;
	try {
		res = await fetch(`${BASE}/api${path}`, {
			method: init.body === undefined ? 'GET' : 'POST',
			headers: {
				...(init.pin ? { authorization: `Bearer ${init.pin}` } : {}),
				...(init.body === undefined ? {} : { 'content-type': 'application/json' })
			},
			body: init.body === undefined ? undefined : JSON.stringify(init.body)
		});
	} catch {
		throw new ApiError(0, 'Cannot reach the bar. Check your connection.');
	}
	const data = await res.json().catch(() => null);
	if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Something went wrong.');
	return data as T;
}

export const api = {
	menu: () => call<PublicMenu>('/menu'),
	login: (pin: string) => call<{ ok: true }>('/login', { pin, body: {} }),
	state: (pin: string) => call<{ core: CoreState; orders: Order[] }>('/state', { pin }),
	op: (pin: string, op: Op) => call<{ core: CoreState }>('/ops', { pin, body: { op } }),
	order: (pin: string, input: OrderInput) =>
		call<{ order: Order }>('/orders', { pin, body: input }),
	voidOrder: (pin: string, id: string, voided: boolean) =>
		call<{ order: Order }>('/orders/void', { pin, body: { id, voided } })
};
