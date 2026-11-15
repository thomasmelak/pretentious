(() => {
	'use strict';
	const cfg = window.PEACOCK || {};
	const $ = (s, el = document) => el.querySelector(s);
	const $$ = (s, el = document) => [...el.querySelectorAll(s)];
	const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.documentElement.classList.add('js');

	/* ---------- Drinks (same recipes as the menu app) ---------- */
	const DRINKS = [
		{ name: 'Martini', spirit: 'gin', mood: 'stirred', style: 'Stirred · Spirit-forward', glass: 'coupe', color: '#E9E3C4', ings: [['Gin', '2½ oz'], ['Dry vermouth', '½ oz'], ['Olive', '1']], method: 'Stir with ice until very cold. Strain into a frozen coupe.', note: 'Cold, clean and faintly briny. The drink the peacock judges you by.' },
		{ name: 'Negroni', spirit: 'gin', mood: 'bitter', style: 'Stirred · Bitter', glass: 'rocks', color: '#B8332A', ings: [['Gin', '1 oz'], ['Campari', '1 oz'], ['Sweet vermouth', '1 oz']], method: 'Stir with ice. Strain over one large cube.', note: 'Bitter, bright and exactly as sweet as it needs to be.' },
		{ name: 'Old Fashioned', spirit: 'whiskey', mood: 'stirred', style: 'Stirred · Spirit-forward', glass: 'rocks', color: '#B76A2A', ings: [['Bourbon', '2 oz'], ['Simple syrup', '¼ oz'], ['Angostura bitters', '2 dashes']], method: 'Stir with ice. Strain over one large cube.', note: 'Whiskey, lightly seasoned. Nothing to hide behind.' },
		{ name: 'Boulevardier', spirit: 'whiskey', mood: 'bitter', style: 'Stirred · Bitter', glass: 'rocks', color: '#9E3423', ings: [['Bourbon', '1¼ oz'], ['Campari', '1 oz'], ['Sweet vermouth', '1 oz']], method: 'Stir with ice. Strain over one large cube.', note: 'A Negroni that went to finishing school in Kentucky.' },
		{ name: 'Whiskey Sour', spirit: 'whiskey', mood: 'sour', style: 'Shaken · Sour', glass: 'rocks', color: '#E0B458', ings: [['Bourbon', '2 oz'], ['Lemon juice', '¾ oz'], ['Simple syrup', '¾ oz']], method: 'Shake with ice. Strain over fresh ice.', note: 'Bourbon and lemon under a silk collar.' },
		{ name: 'Daiquiri', spirit: 'rum', mood: 'sour', style: 'Shaken · Sour', glass: 'coupe', color: '#DCE3B0', ings: [['White rum', '2 oz'], ['Lime juice', '1 oz'], ['Simple syrup', '¾ oz']], method: 'Shake hard with ice. Fine strain into a chilled coupe.', note: 'Rum, lime, sugar. Three ingredients and nowhere to hide.' },
		{ name: 'Jungle Bird', spirit: 'rum', mood: 'bitter', style: 'Shaken · Tropical', glass: 'rocks', color: '#B5412B', ings: [['Dark rum', '1½ oz'], ['Campari', '¾ oz'], ['Pineapple juice', '1½ oz'], ['Lime juice', '½ oz']], method: 'Shake with ice. Strain over fresh ice.', note: 'Dark rum and pineapple with a bitter streak. Our kind of bird.' },
		{ name: 'Mojito', spirit: 'rum', mood: 'long', style: 'Built · Long', glass: 'highball', color: '#CFE0A8', fizz: true, ings: [['White rum', '2 oz'], ['Lime juice', '¾ oz'], ['Simple syrup', '¾ oz'], ['Fresh mint', '8 leaves'], ['Soda water', 'top']], method: 'Press mint gently with syrup, add rum and lime, fill with ice and top with soda.', note: 'Mint, lime and fizz. Pressed, never punished.' },
		{ name: 'Dark & Stormy', spirit: 'rum', mood: 'stirred', style: 'Built · Long', glass: 'highball', color: '#8A5A2B', fizz: true, ings: [['Dark rum', '2 oz'], ['Ginger beer', '4 oz']], method: 'Fill a glass with ice and ginger beer, then float the rum.', note: 'Dark rum over ginger. Weather you can drink.' },
		{ name: 'Margarita', spirit: 'agave', mood: 'sour', style: 'Shaken · Sour', glass: 'rocks', color: '#D9DC9A', ings: [['Tequila blanco', '2 oz'], ['Orange liqueur', '1 oz'], ['Lime juice', '1 oz']], method: 'Shake with ice. Strain over fresh ice.', note: 'Bright agave and lime, salted at your discretion.' },
		{ name: 'Mezcal Negroni', spirit: 'agave', mood: 'bitter', style: 'Stirred · Smoky', glass: 'rocks', color: '#A8372A', ings: [['Mezcal', '1 oz'], ['Campari', '1 oz'], ['Sweet vermouth', '1 oz']], method: 'Stir with ice. Strain over one large cube.', note: 'The Negroni, by a campfire.' },
		{ name: 'Paloma', spirit: 'agave', mood: 'long', style: 'Built · Long', glass: 'highball', color: '#EFA58E', fizz: true, ings: [['Tequila blanco', '2 oz'], ['Grapefruit juice', '2 oz'], ['Lime juice', '½ oz'], ['Soda water', 'top']], method: 'Shake all but the soda, strain over fresh ice and top.', note: 'Grapefruit and tequila, long and a little salty.' },
		{ name: 'Tom Collins', spirit: 'gin', mood: 'long', style: 'Built · Long', glass: 'highball', color: '#EAE6B4', fizz: true, ings: [['Gin', '2 oz'], ['Lemon juice', '¾ oz'], ['Simple syrup', '¾ oz'], ['Soda water', 'top']], method: 'Shake the first three with ice, strain over fresh ice and top with soda.', note: 'Sparkling gin lemonade for adults with standards.' },
		{ name: 'Gimlet', spirit: 'gin', mood: 'sour', style: 'Shaken · Sour', glass: 'coupe', color: '#D2DE9E', ings: [['Gin', '2 oz'], ['Lime juice', '¾ oz'], ['Simple syrup', '¾ oz']], method: 'Shake with ice. Fine strain into a chilled coupe.', note: 'Sharp, green and bracing.' },
		{ name: 'Cosmopolitan', spirit: 'vodka', mood: 'sour', style: 'Shaken · Sour', glass: 'coupe', color: '#D8597A', ings: [['Vodka', '1½ oz'], ['Orange liqueur', '¾ oz'], ['Lime juice', '¾ oz'], ['Cranberry juice', '1 oz']], method: 'Shake with ice. Fine strain into a chilled coupe.', note: 'Pink, tart and unapologetic.' },
		{ name: 'Moscow Mule', spirit: 'vodka', mood: 'long', style: 'Built · Long', glass: 'highball', color: '#E6D9A6', fizz: true, ings: [['Vodka', '2 oz'], ['Lime juice', '½ oz'], ['Ginger beer', '4 oz']], method: 'Build over ice.', note: 'Ginger with a kick, in the mug it insists on.' },
		{ name: 'Espresso Martini', spirit: 'vodka', mood: 'rich', style: 'Shaken · Rich', glass: 'coupe', color: '#4A2E1C', ings: [['Vodka', '1½ oz'], ['Coffee liqueur', '1 oz'], ['Espresso', '1 oz']], method: 'Shake very hard with ice. Fine strain into a chilled coupe.', note: 'Fresh espresso under a proper crema. Wake up, then wind down.' },
		{ name: 'White Russian', spirit: 'vodka', mood: 'rich', style: 'Built · Rich', glass: 'rocks', color: '#CDB89A', ings: [['Vodka', '2 oz'], ['Coffee liqueur', '1 oz'], ['Cream', '1 oz']], method: 'Build over ice and float the cream.', note: 'Coffee and cream. The dessert you ordered instead of dessert.' },
		{ name: 'Manhattan', spirit: 'whiskey', mood: 'rich', style: 'Stirred · Spirit-forward', glass: 'coupe', color: '#8E3A22', ings: [['Rye whiskey', '2 oz'], ['Sweet vermouth', '1 oz'], ['Angostura bitters', '2 dashes']], method: 'Stir with ice. Strain into a chilled coupe.', note: 'Spiced rye rounded off with vermouth. Dressed for dinner.' },
		{ name: 'Gold Rush', spirit: 'whiskey', mood: 'long', style: 'Shaken · Sour', glass: 'rocks', color: '#E3B24A', ings: [['Bourbon', '2 oz'], ['Lemon juice', '¾ oz'], ['Honey syrup', '¾ oz']], method: 'Shake with ice. Strain over one large cube.', note: 'A whiskey sour that prefers honey. Warm and golden.' }
	];
	const REGULARS = ['Martini', 'Negroni', 'Old Fashioned', 'Daiquiri', 'Margarita', 'Espresso Martini'];

	/* ---------- Links to the live menu ---------- */
	if (cfg.menuUrl) {
		$$('[data-menu-link]').forEach((a) => { a.href = cfg.menuUrl; a.hidden = false; });
		$$('[data-menu-link-wrap]').forEach((el) => { el.hidden = false; });
	}

	/* ---------- Navigation ---------- */
	const nav = $('#nav');
	const onScroll = () => nav.classList.toggle('stuck', scrollY > 40);
	addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	/* ---------- Scroll reveal ---------- */
	if ('IntersectionObserver' in window) {
		const io = new IntersectionObserver((entries) => {
			for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
		}, { rootMargin: '0px 0px -8% 0px' });
		$$('.reveal').forEach((el) => io.observe(el));
	} else {
		$$('.reveal').forEach((el) => el.classList.add('in'));
	}

	/* ---------- The peacock ---------- */
	const bird = $('#peacock');
	const svg = $('.peacock', bird);
	const pokeLine = $('#poke-line');
	const POKES = [
		'The peacock noticed. It chose not to react.',
		'Again? Very well.',
		'It does this for a living, you know.',
		'Yes. It is magnificent. Moving on.',
		'This is beneath both of us.',
		'Fine. One more. For the guests.',
		'You could be booking an event right now.',
		'The peacock admires your commitment.'
	];
	let pokes = 0;
	let folding = false;

	if (!calm && matchMedia('(pointer: fine)').matches) {
		addEventListener('pointermove', (e) => {
			const r = svg.getBoundingClientRect();
			const x = (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2);
			svg.style.setProperty('--px', Math.max(-1, Math.min(1, x)).toFixed(3));
		}, { passive: true });
	}

	function olives(x, y, n) {
		if (calm) return;
		for (let i = 0; i < n; i++) {
			const o = document.createElement('i');
			o.className = 'olive-bit';
			o.style.left = x - 9 + 'px';
			o.style.top = y - 6 + 'px';
			document.body.appendChild(o);
			const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
			const v = 160 + Math.random() * 220;
			const dx = Math.cos(a) * v;
			const dy = Math.sin(a) * v;
			const spin = (Math.random() - 0.5) * 720;
			o.animate([
				{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
				{ transform: `translate(${dx * 0.7}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.4 },
				{ transform: `translate(${dx}px, ${dy + 420}px) rotate(${spin}deg)`, opacity: 0 }
			], { duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => o.remove();
		}
	}

	function swapText(el, text) {
		if (el.textContent === text) return;
		el.textContent = text;
		el.classList.remove('swap');
		void el.offsetWidth;
		el.classList.add('swap');
	}

	bird.addEventListener('click', (e) => {
		swapText(pokeLine, POKES[pokes % POKES.length]);
		pokes++;
		const r = svg.getBoundingClientRect();
		const x = e.clientX || r.left + r.width / 2;
		const y = e.clientY || r.top + r.height * 0.4;
		olives(x, y, 9);
		if (folding || calm) return;
		folding = true;
		svg.classList.add('folding');
		setTimeout(() => { svg.classList.remove('folding'); folding = false; }, 1800);
	});

	/* ---------- Pretension dial ---------- */
	const dial = $('#dial');
	const LEVELS = ['Modest', 'Particular', 'Pretentious', 'Insufferable'];
	const levelled = $$('[data-levels]').map((el) => [el, JSON.parse(el.dataset.levels)]);
	function setLevel(n, announce) {
		levelled.forEach(([el, lines]) => swapText(el, lines[n]));
		swapText($('#dial-now'), LEVELS[n]);
		dial.setAttribute('aria-valuetext', LEVELS[n]);
		document.body.dataset.level = n;
		if (announce && n === 3) {
			const r = dial.getBoundingClientRect();
			olives(r.right - 15, r.top + 10, 6);
		}
		if (currentDrink) showVerdict();
		planNote();
	}
	dial.addEventListener('input', () => setLevel(+dial.value, true));

	/* ---------- Drink matcher ---------- */
	const pick = { spirit: null, mood: null };
	let currentDrink = null;
	const glass = $('#glass');
	const VERDICTS = [
		['A sensible choice.', 'Good. That will do nicely.', 'Reliable. Like you, presumably.'],
		['A considered choice.', 'Correct, and we do not say that lightly.', 'You have clearly done this before.'],
		['The peacock approves, which is rare.', 'Excellent. We were hoping you would say that.', 'A choice with opinions. We respect it.'],
		['Finally, someone with taste.', 'The peacock wept. Briefly. With dignity.', 'We shall name an ice cube after you.']
	];

	function candidates() {
		const s = pick.spirit, m = pick.mood;
		let list = DRINKS.filter((d) => (!s || s === 'any' || d.spirit === s) && (!m || d.mood === m));
		if (!list.length) list = DRINKS.filter((d) => !s || s === 'any' || d.spirit === s);
		return list;
	}
	function showVerdict() {
		const set = VERDICTS[+dial.value];
		const exact = (!pick.mood || currentDrink.mood === pick.mood);
		const line = set[DRINKS.indexOf(currentDrink) % set.length];
		$('#m-verdict').textContent = exact ? line : 'Not quite that mood with that spirit, so the peacock improvised. ' + line;
	}
	function pour(d) {
		currentDrink = d;
		glass.classList.remove('full');
		glass.classList.add('shaking');
		setTimeout(() => {
			glass.classList.remove('shaking');
			glass.dataset.glass = d.glass;
			glass.dataset.fizz = d.fizz ? 'true' : 'false';
			glass.style.setProperty('--liquid', d.color);
			glass.style.setProperty('--level', { coupe: '76px', rocks: '138px', highball: '66px' }[d.glass]);
			void glass.getBoundingClientRect();
			glass.classList.add('full');
			swapText($('#m-style'), d.style);
			swapText($('#m-name'), d.name);
			swapText($('#m-note'), d.note);
			swapText($('#m-ings'), d.ings.map((i) => i[0]).join(' · '));
			showVerdict();
		}, calm ? 0 : 450);
	}
	function match(again) {
		const list = candidates();
		let d = list[Math.floor(Math.random() * list.length)];
		if (again && list.length > 1) while (d === currentDrink) d = list[Math.floor(Math.random() * list.length)];
		pour(d);
	}
	$$('.chips[data-group]').forEach((group) => {
		group.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			$$('button', group).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
			const g = group.dataset.group;
			if (g === 'pace') { pace = +b.dataset.v; plan(); return; }
			pick[g] = b.dataset.v;
			match(false);
		});
	});
	$('#shake').addEventListener('click', () => match(true));
	glass.dataset.glass = 'coupe';

	/* ---------- Flip cards ---------- */
	const flips = $('#flips');
	REGULARS.forEach((name) => {
		const d = DRINKS.find((x) => x.name === name);
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'flip reveal';
		b.setAttribute('aria-pressed', 'false');
		b.innerHTML = `<span class="flip-in">
			<span class="face front"><span class="eyebrow">${d.style}</span><h3>${d.name}</h3><span class="note">${d.note}</span><span class="turn">Turn for the recipe</span></span>
			<span class="face back"><span class="eyebrow">${d.name}</span><ul>${d.ings.map((i) => `<li><span>${i[0]}</span><span>${i[1]}</span></li>`).join('')}</ul><p>${d.method}</p><span class="turn">Turn back</span></span>
		</span>`;
		b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
		flips.appendChild(b);
	});
	if ('IntersectionObserver' in window) {
		const io2 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }));
		$$('.flip').forEach((el) => io2.observe(el));
	} else $$('.flip').forEach((el) => el.classList.add('in'));

	/* ---------- Event planner ---------- */
	let pace = 1;
	const guests = $('#p-guests'), hours = $('#p-hours');
	const shown = {};
	function countTo(id, to) {
		const el = $('#' + id);
		const from = shown[id] || 0;
		shown[id] = to;
		if (calm || from === to) { el.textContent = to.toLocaleString('en'); return; }
		const t0 = performance.now();
		const step = (t) => {
			if (shown[id] !== to) return;
			const k = Math.min(1, (t - t0) / 500);
			el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))).toLocaleString('en');
			if (k < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}
	function numbers() {
		const g = +guests.value, h = +hours.value;
		// Rules of thumb: a first-hour rush, then a steadier pace per guest per hour.
		const first = [1, 2, 2][pace], after = [0.75, 1, 1.5][pace];
		const drinks = Math.round(g * (first + after * (h - 1)));
		return {
			g, h, drinks,
			staff: Math.max(1, Math.ceil(g / 40)),
			ice: Math.round(g * 0.7),
			citrus: Math.round(drinks * 0.5 * 0.75)
		};
	}
	function planNote() {
		const n = numbers();
		const lines = [
			`About ${Math.round(n.drinks / n.g)} drinks each. Perfectly reasonable.`,
			`About ${Math.round(n.drinks / n.g)} drinks each, shaken or stirred one at a time.`,
			`About ${Math.round(n.drinks / n.g)} drinks each. We have seen worse. We have poured worse.`,
			`About ${Math.round(n.drinks / n.g)} drinks each. Every one of them an occasion.`
		];
		$('#plan-note').textContent = lines[+dial.value];
	}
	function plan() {
		const n = numbers();
		$('#o-guests').textContent = n.g;
		$('#o-hours').textContent = n.h;
		countTo('s-drinks', n.drinks);
		countTo('s-staff', n.staff);
		countTo('s-ice', n.ice);
		countTo('s-citrus', n.citrus);
		$('#s-staff-l').textContent = n.staff === 1 ? 'bartender' : 'bartenders';
		const heads = $('#heads');
		while (heads.children.length > n.staff) heads.lastChild.remove();
		while (heads.children.length < n.staff) {
			const im = new Image(44, 44);
			im.src = 'assets/favicon.svg';
			im.alt = '';
			heads.appendChild(im);
		}
		planNote();
	}
	guests.addEventListener('input', plan);
	hours.addEventListener('input', plan);

	/* ---------- Enquiry ---------- */
	const form = $('#form');
	const msg = $('#form-msg');
	let fromPlanner = false;
	$('#plan-send').addEventListener('click', () => {
		const n = numbers();
		form.guests.value = n.g;
		fromPlanner = true;
	});
	function compose() {
		const f = form;
		const n = numbers();
		const lines = [
			'Hello,',
			'',
			`I would like to ask about a bar for ${f.occasion.value.toLowerCase() === 'something else' ? 'an event' : 'a ' + f.occasion.value.toLowerCase()}.`,
			'',
			`Date: ${f.date.value || 'to be decided'}`,
			`Guests: ${f.guests.value || 'to be decided'}`
		];
		if (fromPlanner) lines.push(`Hours of service: ${n.h}`, `Planner estimate: about ${n.drinks} cocktails, ${n.staff} ${n.staff === 1 ? 'bartender' : 'bartenders'}`);
		if (currentDrink) lines.push(`The peacock matched me with: ${currentDrink.name}`);
		if (f.notes.value.trim()) lines.push('', f.notes.value.trim());
		lines.push('', 'Thank you,', f.name.value.trim());
		return { subject: `Event enquiry from ${f.name.value.trim()}`, body: lines.join('\n') };
	}
	function valid() {
		const ok = form.name.value.trim().length > 0;
		form.name.setAttribute('aria-invalid', ok ? 'false' : 'true');
		if (!ok) { msg.textContent = 'We need a name to reply to. Even a pretentious one.'; form.name.focus(); }
		return ok;
	}
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		if (!valid()) return;
		const m = compose();
		location.href = `mailto:${encodeURIComponent(cfg.enquiryEmail || '')}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
		msg.textContent = 'Your mail app should now be open with the message written. Press send when you are ready.';
		const r = e.submitter ? e.submitter.getBoundingClientRect() : form.getBoundingClientRect();
		olives(r.left + r.width / 2, r.top, 8);
	});
	$('#copy').addEventListener('click', async () => {
		if (!valid()) return;
		const m = compose();
		try {
			await navigator.clipboard.writeText(m.subject + '\n\n' + m.body);
			msg.textContent = 'Copied. Paste it into any message you like.';
		} catch {
			msg.textContent = 'Copying was blocked by the browser. Use "Draft the email" instead.';
		}
	});

	setLevel(+dial.value, false);
	plan();
})();
