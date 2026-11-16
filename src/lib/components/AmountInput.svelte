<!--
	A measure: quantity plus unit. Ounces and millilitres convert into each other as you
	switch, and the other unit is shown beside the field as you type.
-->
<script lang="ts">
	import { convertQuantity, measures, parseQuantity, type Unit } from '#lib/shared/measure.ts';

	interface Props {
		value: string;
		label: string;
		onchange: (value: string) => void;
	}

	let { value, label, onchange }: Props = $props();

	const UNITS = ['oz', 'ml', 'dashes', 'barspoons', 'leaves', 'slices', 'whole', 'top', 'rinse'];
	const NO_QTY = new Set(['top', 'rinse']);

	/** Split "1½ oz" into ["1½", "oz"]. Unknown text stays as a quantity in ounces. */
	function split(text: string): [string, string] {
		const t = text.trim();
		if (!t) return ['', 'oz'];
		if (NO_QTY.has(t.toLowerCase())) return ['', t.toLowerCase()];
		const m = t.match(/^(.*?)\s*([a-zA-Z]+)\.?$/);
		if (m) {
			const word = m[2].toLowerCase();
			const unit =
				word === 'cl' ? 'cl' : UNITS.find((u) => u === word || u.replace(/e?s$/, '') === word);
			if (unit === 'cl') {
				const n = parseQuantity(m[1]);
				if (n !== null) return [String(n * 10), 'ml'];
			} else if (unit) {
				return [m[1], unit];
			}
		}
		return [t, 'oz'];
	}

	// svelte-ignore state_referenced_locally
	const [startQty, startUnit] = split(value);
	let qty = $state(startQty);
	let unit = $state(startUnit);

	const join = () => (NO_QTY.has(unit) ? unit : qty.trim() ? `${qty.trim()} ${unit}` : '');
	const other = $derived.by(() => {
		if (unit !== 'oz' && unit !== 'ml') return '';
		if (!qty.trim()) return '';
		if (parseQuantity(qty) === null) return 'Try 1½, 1 1/2 or 0.75';
		return `= ${measures(join())[1] ?? ''}`;
	});

	function changeUnit(next: string) {
		if ((unit === 'oz' || unit === 'ml') && (next === 'oz' || next === 'ml')) {
			qty = convertQuantity(qty, unit as Unit, next as Unit);
		}
		unit = next;
		onchange(join());
	}
</script>

<div class="amount">
	<input
		class="qty"
		bind:value={qty}
		oninput={() => onchange(join())}
		disabled={NO_QTY.has(unit)}
		inputmode="decimal"
		placeholder={unit === 'ml' ? '45' : '1½'}
		aria-label={`${label}: amount`}
		maxlength="10"
	/>
	<select
		value={unit}
		onchange={(e) => changeUnit(e.currentTarget.value)}
		aria-label={`${label}: unit`}
	>
		{#each UNITS as u (u)}
			<option value={u}>{u}</option>
		{/each}
	</select>
	<span class="other" class:warn={other.startsWith('Try')} aria-live="polite">{other}</span>
</div>

<style>
	.amount {
		display: grid;
		grid-template-columns: 5.5em 7.5em minmax(5em, 1fr);
		gap: 6px;
		align-items: center;
	}
	.qty {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.other {
		font-size: 14px;
		color: var(--muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.other.warn {
		color: var(--out);
		white-space: normal;
		font-size: 13px;
	}
</style>
