/**
 * The Pretentious Peacock API, as a Cloudflare Worker backed by a D1 database.
 *
 * Guests read the live menu without signing in; everything else needs the bar
 * passphrase (the BAR_PIN secret).
 */
import { buildOrder, emptyCore, publicMenu } from '../src/lib/shared/logic.ts';
import { applyOp } from '../src/lib/shared/reducer.ts';
import type { CoreState, Op, Order, OrderInput } from '../src/lib/shared/types.ts';

interface Env {
	DB: D1Database;
	ASSETS?: Fetcher;
	BAR_PIN?: string;
	ALLOWED_ORIGIN?: string;
}

class HttpError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

const corsHeaders = (env: Env) => ({
	'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-max-age': '86400',
	vary: 'origin'
});

const json = (env: Env, body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders(env), 'content-type': 'application/json', 'cache-control': 'no-store' }
	});

async function sha256(text: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** Compare via hashes so the check takes the same time whatever was sent. */
async function pinMatches(candidate: string, pin: string): Promise<boolean> {
	const [a, b] = await Promise.all([sha256(candidate), sha256(pin)]);
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

async function requireBartender(req: Request, env: Env) {
	if (!env.BAR_PIN) throw new HttpError(503, 'The bar passphrase is not set on the server.');
	const header = req.headers.get('authorization') ?? '';
	const candidate = header.startsWith('Bearer ') ? header.slice(7) : '';
	if (!(await pinMatches(candidate, env.BAR_PIN))) {
		// Slow down guessing.
		await new Promise((resolve) => setTimeout(resolve, 400));
		throw new HttpError(401, 'Wrong passphrase.');
	}
}

async function readCore(env: Env): Promise<{ core: CoreState; exists: boolean }> {
	const row = await env.DB.prepare('SELECT data FROM core WHERE id = 1').first<{ data: string }>();
	return row ? { core: JSON.parse(row.data), exists: true } : { core: emptyCore(), exists: false };
}

/** Apply an action, retrying if another bartender wrote first. */
async function writeOp(env: Env, op: Op): Promise<CoreState> {
	for (let attempt = 0; attempt < 8; attempt++) {
		const { core, exists } = await readCore(env);
		let next: CoreState;
		try {
			next = applyOp(core, op);
		} catch (err) {
			throw new HttpError(400, err instanceof Error ? err.message : 'That did not work.');
		}
		const data = JSON.stringify(next);
		// Only write if nobody else has since: the update matches on the revision we read,
		// and the first-ever insert is ignored if a row already appeared.
		const result = exists
			? await env.DB.prepare('UPDATE core SET rev = ?, data = ? WHERE id = 1 AND rev = ?')
					.bind(next.rev, data, core.rev)
					.run()
			: await env.DB.prepare('INSERT OR IGNORE INTO core (id, rev, data) VALUES (1, ?, ?)')
					.bind(next.rev, data)
					.run();
		if (result.meta.changes === 1) {
			if (op.type === 'event.delete') {
				await env.DB.prepare('DELETE FROM orders WHERE event_id = ?').bind(op.id).run();
			}
			return next;
		}
	}
	throw new HttpError(409, 'The bar is busy. Try again.');
}

async function listOrders(env: Env): Promise<Order[]> {
	const { results } = await env.DB.prepare('SELECT data FROM orders ORDER BY at DESC').all<{
		data: string;
	}>();
	return results.map((row) => JSON.parse(row.data));
}

async function body<T>(req: Request): Promise<T> {
	try {
		return (await req.json()) as T;
	} catch {
		throw new HttpError(400, 'Expected a JSON body.');
	}
}

async function api(req: Request, env: Env, path: string): Promise<Response> {
	const route = `${req.method} ${path}`;

	if (route === 'GET /api/menu') {
		const { core } = await readCore(env);
		return json(env, publicMenu(core));
	}

	if (route === 'GET /api/health') return json(env, { ok: true, pinSet: Boolean(env.BAR_PIN) });

	await requireBartender(req, env);

	if (route === 'POST /api/login') return json(env, { ok: true });

	if (route === 'GET /api/state') {
		const [{ core }, orders] = await Promise.all([readCore(env), listOrders(env)]);
		return json(env, { core, orders });
	}

	if (route === 'POST /api/ops') {
		const { op } = await body<{ op: Op }>(req);
		if (!op || typeof op.type !== 'string') throw new HttpError(400, 'Missing action.');
		return json(env, { core: await writeOp(env, op) });
	}

	if (route === 'POST /api/orders') {
		const input = await body<OrderInput>(req);
		const { core } = await readCore(env);
		let order: Order;
		try {
			order = buildOrder(core, input, crypto.randomUUID(), new Date().toISOString());
		} catch (err) {
			throw new HttpError(400, err instanceof Error ? err.message : 'That order did not work.');
		}
		await env.DB.prepare('INSERT INTO orders (id, event_id, at, data) VALUES (?, ?, ?, ?)')
			.bind(order.id, order.eventId, order.at, JSON.stringify(order))
			.run();
		return json(env, { order }, 201);
	}

	if (route === 'POST /api/orders/void') {
		const { id, voided } = await body<{ id: string; voided: boolean }>(req);
		const row = await env.DB.prepare('SELECT data FROM orders WHERE id = ?')
			.bind(String(id))
			.first<{ data: string }>();
		if (!row) throw new HttpError(404, 'That order no longer exists.');
		const order: Order = { ...JSON.parse(row.data), voided: Boolean(voided) };
		await env.DB.prepare('UPDATE orders SET data = ? WHERE id = ?')
			.bind(JSON.stringify(order), order.id)
			.run();
		return json(env, { order });
	}

	throw new HttpError(404, 'Not found.');
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(req.url);
		if (pathname.startsWith('/api/')) {
			if (req.method === 'OPTIONS') {
				return new Response(null, { status: 204, headers: corsHeaders(env) });
			}
			try {
				return await api(req, env, pathname);
			} catch (err) {
				if (err instanceof HttpError) return json(env, { error: err.message }, err.status);
				console.error(err);
				return json(env, { error: 'Something went wrong behind the bar.' }, 500);
			}
		}
		// Everything else is the built site, when it is deployed alongside the API.
		return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
	}
} satisfies ExportedHandler<Env>;
