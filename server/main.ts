/**
 * The Pretentious Peacock API.
 *
 * A small Deno server backed by Deno KV. Guests read the live menu without
 * signing in; everything else needs the bar passphrase (BAR_PIN).
 *
 *   BAR_PIN         required. The passphrase bartenders sign in with.
 *   ALLOWED_ORIGIN  optional. Origin allowed to call the API (default "*").
 *   PORT            optional. Defaults to 8000.
 *   KV_PATH         optional. Path of the local KV file (default: Deno's own).
 */
import { serveDir } from 'jsr:@std/http@1/file-server';
import { buildOrder, emptyCore, publicMenu } from '../src/lib/shared/logic.ts';
import { applyOp } from '../src/lib/shared/reducer.ts';
import type { CoreState, Op, Order, OrderInput } from '../src/lib/shared/types.ts';

const PIN = Deno.env.get('BAR_PIN') ?? '';
const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const STATIC_DIR = new URL('../build', import.meta.url).pathname;

const kv = await Deno.openKv(Deno.env.get('KV_PATH') || undefined);
const CORE_KEY = ['core'];

class HttpError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

const cors = {
	'access-control-allow-origin': ORIGIN,
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-max-age': '86400',
	vary: 'origin'
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' }
	});

async function sha256(text: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** Compare via hashes so the check takes the same time whatever was sent. */
async function pinMatches(candidate: string): Promise<boolean> {
	if (!PIN) return false;
	const [a, b] = await Promise.all([sha256(candidate), sha256(PIN)]);
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

async function requireBartender(req: Request) {
	if (!PIN) throw new HttpError(503, 'The bar passphrase is not set on the server (BAR_PIN).');
	const header = req.headers.get('authorization') ?? '';
	const candidate = header.startsWith('Bearer ') ? header.slice(7) : '';
	if (!(await pinMatches(candidate))) {
		// Slow down guessing.
		await new Promise((resolve) => setTimeout(resolve, 400));
		throw new HttpError(401, 'Wrong passphrase.');
	}
}

async function readCore(): Promise<{ core: CoreState; versionstamp: string | null }> {
	const entry = await kv.get<CoreState>(CORE_KEY);
	return { core: entry.value ?? emptyCore(), versionstamp: entry.versionstamp };
}

/** Apply an action atomically, retrying if another bartender wrote first. */
async function writeOp(op: Op): Promise<CoreState> {
	for (let attempt = 0; attempt < 8; attempt++) {
		const { core, versionstamp } = await readCore();
		let next: CoreState;
		try {
			next = applyOp(core, op);
		} catch (err) {
			throw new HttpError(400, err instanceof Error ? err.message : 'That did not work.');
		}
		const result = await kv
			.atomic()
			.check({ key: CORE_KEY, versionstamp })
			.set(CORE_KEY, next)
			.commit();
		if (result.ok) {
			if (op.type === 'event.delete') await deleteOrders(op.id);
			return next;
		}
	}
	throw new HttpError(409, 'The bar is busy. Try again.');
}

async function listOrders(eventId?: string): Promise<Order[]> {
	const orders: Order[] = [];
	const prefix = eventId ? ['orders', eventId] : ['orders'];
	for await (const entry of kv.list<Order>({ prefix })) orders.push(entry.value);
	return orders.sort((a, b) => (a.at < b.at ? 1 : -1));
}

async function deleteOrders(eventId: string) {
	for await (const entry of kv.list({ prefix: ['orders', eventId] })) await kv.delete(entry.key);
}

async function body<T>(req: Request): Promise<T> {
	try {
		return (await req.json()) as T;
	} catch {
		throw new HttpError(400, 'Expected a JSON body.');
	}
}

async function api(req: Request, path: string): Promise<Response> {
	const route = `${req.method} ${path}`;

	if (route === 'GET /api/menu') {
		const { core } = await readCore();
		return json(publicMenu(core));
	}

	if (route === 'GET /api/health') return json({ ok: true, pinSet: PIN !== '' });

	await requireBartender(req);

	if (route === 'POST /api/login') return json({ ok: true });

	if (route === 'GET /api/state') {
		const [{ core }, orders] = await Promise.all([readCore(), listOrders()]);
		return json({ core, orders });
	}

	if (route === 'POST /api/ops') {
		const { op } = await body<{ op: Op }>(req);
		if (!op || typeof op.type !== 'string') throw new HttpError(400, 'Missing action.');
		return json({ core: await writeOp(op) });
	}

	if (route === 'POST /api/orders') {
		const input = await body<OrderInput>(req);
		const { core } = await readCore();
		let order: Order;
		try {
			order = buildOrder(core, input, crypto.randomUUID(), new Date().toISOString());
		} catch (err) {
			throw new HttpError(400, err instanceof Error ? err.message : 'That order did not work.');
		}
		await kv.set(['orders', order.eventId, order.id], order);
		return json({ order }, 201);
	}

	if (route === 'POST /api/orders/void') {
		const { eventId, id, voided } = await body<{ eventId: string; id: string; voided: boolean }>(
			req
		);
		const key = ['orders', String(eventId), String(id)];
		const entry = await kv.get<Order>(key);
		if (!entry.value) throw new HttpError(404, 'That order no longer exists.');
		const order = { ...entry.value, voided: Boolean(voided) };
		await kv.set(key, order);
		return json({ order });
	}

	throw new HttpError(404, 'Not found.');
}

async function handle(req: Request): Promise<Response> {
	const { pathname } = new URL(req.url);
	if (pathname.startsWith('/api/')) {
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
		try {
			return await api(req, pathname);
		} catch (err) {
			if (err instanceof HttpError) return json({ error: err.message }, err.status);
			console.error(err);
			return json({ error: 'Something went wrong behind the bar.' }, 500);
		}
	}
	// Serve the built app when it exists, so one server can host everything.
	return serveDir(req, { fsRoot: STATIC_DIR, quiet: true });
}

if (!PIN) console.warn('BAR_PIN is not set: bartender sign-in is disabled until it is.');

Deno.serve({ port: Number(Deno.env.get('PORT') ?? 8000) }, handle);
