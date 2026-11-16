/**
 * Measures. Bartenders write "1½ oz", "1 1/2", "¾", "45 ml" or "2 dashes"; guests and
 * staff see volumes in both ounces and millilitres. One ounce is poured as 30 ml.
 */

export const ML_PER_OZ = 30;

export type Unit = 'oz' | 'ml';

export interface Volume {
	/** The amount in ounces. */
	oz: number;
	/** The unit it was written in. */
	unit: Unit;
}

const FRACTIONS: Record<string, number> = {
	'¼': 0.25,
	'½': 0.5,
	'¾': 0.75,
	'⅓': 1 / 3,
	'⅔': 2 / 3,
	'⅛': 0.125,
	'⅜': 0.375,
	'⅝': 0.625,
	'⅞': 0.875
};

/** "1½", "1 1/2", "3/4", "0.75", "¾" as a number, or null. */
export function parseQuantity(text: string): number | null {
	const t = text.trim().replace(',', '.');
	if (!t) return null;
	const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:([¼½¾⅓⅔⅛⅜⅝⅞])|(\d+)\s*\/\s*(\d+))?$/);
	if (!m || (!m[1] && !m[2] && !m[3])) return null;
	let n = m[1] ? Number(m[1]) : 0;
	if (m[2]) n += FRACTIONS[m[2]];
	if (m[3]) {
		const den = Number(m[4]);
		if (!den) return null;
		// "1 1/2" adds; a bare "3/4" is just the fraction.
		n += Number(m[3]) / den;
	}
	return n > 0 && n < 1000 ? n : null;
}

/** A volume measure, or null for dashes, leaves, "top" and the like. */
export function parseVolume(amount: string): Volume | null {
	const m = amount
		.trim()
		.toLowerCase()
		.match(/^(.*?)\s*(oz|ounces?|ml|millilit(?:re|er)s?|cl)?\.?$/);
	if (!m) return null;
	const qty = parseQuantity(m[1]);
	if (qty === null) return null;
	const unit = m[2] ?? '';
	if (unit.startsWith('ml') || unit.startsWith('milli')) return { oz: qty / ML_PER_OZ, unit: 'ml' };
	if (unit === 'cl') return { oz: (qty * 10) / ML_PER_OZ, unit: 'ml' };
	// No unit on a bare number means ounces, as bartenders write it.
	return { oz: qty, unit: 'oz' };
}

const GLYPH: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** Ounces to the nearest quarter, the way a jigger reads: "1½", "¾". */
export function formatOz(oz: number): string {
	const quarters = Math.round(oz * 4) / 4;
	const whole = Math.floor(quarters);
	const part = GLYPH[quarters - whole] ?? '';
	const exact = Math.abs(quarters - oz) < 0.02;
	const body = whole === 0 && part ? part : `${whole}${part}`;
	return `${exact ? '' : '≈'}${body === '0' ? (oz > 0 ? '<¼' : '0') : body}`;
}

/** Millilitres to the nearest half: "22.5", "45". */
export function formatMl(oz: number): string {
	const ml = Math.round(oz * ML_PER_OZ * 2) / 2;
	return Number.isInteger(ml) ? String(ml) : ml.toFixed(1);
}

/** Both units, the one it was written in first: ["1½ oz", "45 ml"]. Non-volumes stay as written. */
export function measures(amount: string): [string, string?] {
	const v = parseVolume(amount);
	if (!v) return [amount.trim()];
	const oz = `${formatOz(v.oz)} oz`;
	const ml = `${formatMl(v.oz)} ml`;
	return v.unit === 'oz' ? [oz, ml] : [ml, oz];
}

/** Turn a quantity typed in one unit into the other, as text for the input. */
export function convertQuantity(text: string, from: Unit, to: Unit): string {
	const n = parseQuantity(text);
	if (n === null || from === to) return text;
	const oz = from === 'oz' ? n : n / ML_PER_OZ;
	return to === 'oz' ? formatOz(oz).replace('≈', '') : formatMl(oz);
}

/** An amount for several drinks at once: "1½ oz" × 3 is ["4½ oz", "135 ml"]. Non-volumes stay as written. */
export function scaled(amount: string, times: number): [string, string?] | null {
	const v = parseVolume(amount);
	if (!v || times <= 1) return null;
	const oz = `${formatOz(v.oz * times)} oz`;
	const ml = `${formatMl(v.oz * times)} ml`;
	return v.unit === 'oz' ? [oz, ml] : [ml, oz];
}

export interface Usage {
	n: number;
	unit: 'ml' | 'each';
}

const EACH = /\b(leaf|leaves|slices?|wheels?|wedges?|whole|sprigs?|twists?|peels?|cubes?|pieces?|eggs?|whites?|olives?|cherr(?:y|ies)|beans?)\b/;

/**
 * How much of an ingredient one drink uses, for keeping count of stock. Dashes, a
 * barspoon, a rinse and a top-up get a typical pour; a bare number of a garnish counts
 * the pieces. Null when there is no sensible guess.
 */
export function usage(amount: string, category?: string): Usage | null {
	const t = amount.trim().toLowerCase();
	if (!t) return null;
	const lead = t.match(/^([\d.,\s/¼½¾⅓⅔⅛⅜⅝⅞]+)/);
	const count = lead ? parseQuantity(lead[1]) : null;
	if (/dash/.test(t)) return { n: (count ?? 1) * 0.8, unit: 'ml' };
	if (/drop/.test(t)) return { n: (count ?? 1) * 0.05, unit: 'ml' };
	if (/barspoon|bar spoon|tsp|teaspoon/.test(t)) return { n: (count ?? 1) * 5, unit: 'ml' };
	if (/rinse|spritz|mist/.test(t)) return { n: 5, unit: 'ml' };
	if (/^top|top up|to top|fill/.test(t)) return { n: 90, unit: 'ml' };
	if (EACH.test(t)) return { n: count ?? 1, unit: 'each' };
	if (category === 'fresh' && count !== null && !/oz|ml|cl/.test(t)) return { n: count, unit: 'each' };
	const v = parseVolume(t);
	return v ? { n: v.oz * ML_PER_OZ, unit: 'ml' } : null;
}
