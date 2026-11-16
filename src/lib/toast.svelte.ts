export type Tone = 'plain' | 'ok' | 'out';

interface Toast {
	id: number;
	text: string;
	tone: Tone;
}

/** Short messages that appear at the foot of the screen and leave on their own. */
class Toasts {
	items = $state<Toast[]>([]);
	#next = 0;

	push(text: string, tone: Tone = 'plain', ms = 4200) {
		const id = ++this.#next;
		// Never stack more than three.
		this.items = [...this.items.slice(-2), { id, text, tone }];
		setTimeout(() => this.dismiss(id), ms);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new Toasts();
