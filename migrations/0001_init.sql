-- Everything except orders lives in one JSON document. `rev` guards concurrent writes.
CREATE TABLE IF NOT EXISTS core (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	rev INTEGER NOT NULL,
	data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
	id TEXT PRIMARY KEY,
	event_id TEXT NOT NULL,
	at TEXT NOT NULL,
	data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_by_event ON orders (event_id, at);
