export function money(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency,
			minimumFractionDigits: Number.isInteger(amount) ? 0 : 2
		}).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}

export function eventDate(iso: string): string {
	if (!iso) return '';
	const d = new Date(`${iso}T12:00:00`);
	return Number.isNaN(d.getTime())
		? iso
		: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function clock(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const newId = () => crypto.randomUUID().slice(0, 8);
