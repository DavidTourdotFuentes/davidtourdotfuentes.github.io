// Relie les cartes au site : les grilles ne montrent que les cartes découvertes.
// Fonctions de app.js et translations.js utilisées ici : getTranslation, applyTranslations, currentLang, lockScroll, unlockScroll.
import { createBooster } from './booster.js';
import { createCard, createReveal, el, iconButton, text } from './card.js';
import { createDetail } from './detail.js';
import { createDial } from './dial.js';
import { createTimeline } from './timeline.js';
import { checkCards, checkEvents, dateText, playerOf, textOf, toHtml } from './content.js';
import { CARDS } from './data.js';
import { EVENTS } from './events.js';
import { createKnob, createMeter, needleAngle, svg } from './meter.js';
import { Collection, drawBooster } from './collection.js';
import { BOOSTER, RARITIES, TAGS, TYPES } from './config.js';

const rarities = RARITIES.map((rarity, level) => ({ ...rarity, level }));
const findRarity = (id) => rarities.find((rarity) => rarity.id === id);

const grids = [...document.querySelectorAll('[data-types]')];

/** Crée la case d'une carte dans la grille de son type, dans l'ordre de data.js. */
function readCard(data) {
    const isProject = data.type === 'project';
    const node = el('div', 'grid-card');
    node.dataset.card = data.id;
    grids.find((grid) => grid.dataset.types.split(' ').includes(data.type)).append(node);
    return { id: data.id, data, node, isProject, type: data.type, art: data.art ?? TYPES[data.type].art, icon: TYPES[data.type].icon, rarity: findRarity(data.rarity) ?? rarities[0], isShown: null };
}

for (const problem of checkCards(CARDS, { rarities: RARITIES, tags: TAGS, types: TYPES })) console.warn(`cards/data.js, ${problem}`);
for (const problem of checkEvents(EVENTS)) console.warn(`cards/events.js, ${problem}`);
const cards = CARDS.filter(({ type }) => type in TYPES).map(readCard); // une carte de type inconnu est signalée, pas affichée
const collection = new Collection(cards);
const newCards = new Set(); // découvertes pendant cette visite

/** Contenu d'une carte, dans la langue courante. */
function describe({ data }) {
    const get = (value) => textOf(value, currentLang);
    const short = get(data.short);
    return {
        name: get(data.name),
        role: get(data.role),
        label: get(data.label),
        year: data.year ? String(data.year) : '',
        html: toHtml(short),
        longHtml: toHtml(get(data.long) || short),
        image: data.image,
        crop: data.crop === undefined ? '' : `${data.crop}%`,
        zoom: data.zoom,
        embed: playerOf(data.player),
    };
}

// --- Grilles ---

const LOCK = '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>';

/** Carte pas encore vue : on la devine, floue et en noir et blanc, pour donner envie de la débloquer. */
function lockedCard(card) {
    const face = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length, { tilts: false });
    face.classList.add('is-flipped', 'tcard--locked');
    face.setAttribute('aria-hidden', 'true'); // rien à lire tant qu'elle est floue
    face.querySelector('img').loading = 'lazy'; // les cartes cachées sont nombreuses : leur image attend d'approcher de l'écran
    return [face, el('span', 'locked-badge', {}, svg('', '0 0 24 24', LOCK)), text('span', 'sr-only', 'cards_hidden')];
}

function showCard(card) {
    const isShown = collection.has(card);
    const { node, rarity } = card;
    node.classList.toggle('is-new', newCards.has(card));
    if (card.isShown === isShown) return;

    card.isShown = isShown;
    node.classList.toggle('is-undiscovered', !isShown);
    node.style.order = isShown ? 0 : 1; // les cartes découvertes d'abord
    node.style.setProperty('--rarity', rarity.color);
    // Une carte découverte s'ouvre au clic ou au clavier.
    node.tabIndex = isShown ? 0 : -1;
    if (isShown) node.setAttribute('role', 'button');
    else node.removeAttribute('role');
    if (!isShown) {
        node.replaceChildren(...lockedCard(card));
        return;
    }
    const face = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length);
    face.classList.add('is-flipped');
    face.firstChild.append(text('span', 'new-tag', 'cards_new')); // fixée à la carte, pour s'incliner avec elle
    node.replaceChildren(face);
}

const detail = createDetail({ cards, describe });
const timeline = createTimeline(document.getElementById('timeline-years'), {
    cards: cards.filter(({ type }) => TYPES[type].timeline), // les formations y sont déjà en évènements
    events: EVENTS,
    describe,
    describeEvent: ({ title }, day) => ({ title: textOf(title, currentLang), date: dateText(day, currentLang) }),
    onOpen: detail.open,
});
const dial = createDial(document.getElementById('dial'), {
    cards,
    describe,
    has: (card) => collection.has(card),
    onOpen: detail.open,
    onBooster: () => booster.open(),
});
for (const card of cards) {
    const open = () => { if (collection.has(card)) detail.open(card); };
    card.node.addEventListener('click', open);
    card.node.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); // Espace ferait défiler la page
        open();
    });
}

// --- Filtres des projets ---

const filters = document.getElementById('filters');
for (const [tag, key] of [['', 'tags_all'], ...Object.entries(TAGS)]) {
    const button = text('button', 'filter-btn', key);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(!tag));
    button.addEventListener('click', () => {
        for (const other of filters.children) other.setAttribute('aria-pressed', String(other === button));
        for (const { isProject, node, data } of cards) if (isProject) node.hidden = Boolean(tag) && !data.tags?.includes(tag);
    });
    filters.append(button);
}

// --- Barre de collection ---

const bar = document.getElementById('collection');
// Progression : une graduation par carte, les plus rares dans le rouge.
const legendaries = cards.filter((card) => card.rarity === rarities.at(-1)).length;
const meter = createMeter({ ticks: cards.length + 1, red: cards.length - legendaries, labels: [], crete: 'var(--crete)', needle: 'var(--aiguille)' });
const count = el('span', ''); // « 10 / 33 Cartes »
const gauge = el('div', 'gauge', {}, meter, el('strong', 'gauge__count', {}, count, ` / ${cards.length} `, text('span', '', 'meter_cards')));
const chips = el('div', 'collection__chips');
const openButton = text('button', 'btn', 'cards_open_booster');
openButton.type = 'button';
openButton.addEventListener('click', () => booster.open());

function link(key, onClick) {
    const node = text('button', 'booster__link', key);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}
const revealButton = iconButton('cards_reveal_all', 'reveal', 'btn btn--line', revealAll);
const resetButton = iconButton('cards_reset', 'reset', 'btn btn--line', resetAll);
const resetLink = link('cards_reset', resetAll);

// Sous le nom, à l'accueil : tout révéler, puis descendre aux projets.
const reveal = document.getElementById('reveal');
const revealInvite = createReveal(revealAll);
const workLink = el('a', 'btn', { href: '#portfolio' }, text('span', '', 'view_work'));
reveal.append(...revealInvite, workLink);

const floating = el('button', 'floating-booster', { type: 'button' }, text('span', '', 'cards_open_booster'));
floating.addEventListener('click', () => booster.open());

bar.append(el('div', 'collection__main', {}, gauge, chips), el('div', 'collection__actions', {}, openButton, revealButton, resetButton, resetLink));
document.body.append(floating);

// Inutile près du cadran et du bouton, et il gênerait la page contact.
const inView = new Set();
const tuck = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) inView[isIntersecting ? 'add' : 'delete'](target);
    floating.classList.toggle('is-tucked', inView.size > 0);
});
tuck.observe(openButton);
tuck.observe(document.getElementById('dial'));
tuck.observe(document.querySelector('.contact__email'));

function update() {
    cards.forEach(showCard);
    const isComplete = collection.count === cards.length;
    timeline.render();
    dial.update();
    const found = collection.count;
    meter.style.setProperty('--needle', `${needleAngle(found / cards.length)}deg`);
    count.textContent = found;
    chips.replaceChildren(...rarities.map((rarity) => {
        const all = cards.filter((card) => card.rarity === rarity);
        const shown = all.filter((card) => collection.has(card)).length;
        const chip = el('span', 'collection__chip', {}, createKnob(rarity), text('span', '', `rarity_${rarity.id}`), ` ${shown}/${all.length}`);
        chip.dataset.rarity = rarity.id;
        return chip;
    }));
    openButton.hidden = floating.hidden = isComplete;
    const canReveal = !isComplete && BOOSTER.allowRevealAll;
    for (const node of [...revealInvite, revealButton]) node.hidden = !canReveal;
    workLink.hidden = canReveal;
    resetButton.hidden = !isComplete;
    resetLink.hidden = collection.count === 0 || isComplete; // en cours de collection, plus discret
    applyTranslations(translations);
}

function resetAll() {
    newCards.clear();
    collection.reset();
    update();
    booster.open();
}

function revealAll() {
    collection.add(cards);
    dial.aimAt(cards.find((card) => card.rarity === rarities.at(-1)));
    update();
}

// --- Boosters ---

const booster = createBooster({
    cards,
    size: BOOSTER.size,
    describe,
    remaining: () => collection.hidden.length,
    draw() {
        const drawn = drawBooster(collection.hidden, { size: BOOSTER.size, guaranteed: findRarity(BOOSTER.guaranteed) });
        for (const card of drawn) newCards.add(card);
        collection.add(drawn);
        dial.aimAt(drawn.reduce((best, card) => (card.rarity.level > best.rarity.level ? card : best))); // la plus rare du booster
        return drawn;
    },
    onOpen: detail.open,
    onRevealAll: BOOSTER.allowRevealAll ? revealAll : null,
    onClose(opened) {
        collection.save(); // le booster de bienvenue n'est proposé qu'une fois
        update();
        if (opened) document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
    },
});

// Les textes des cartes sont écrits à leur création : on les refait quand la langue change.
document.addEventListener('translationschange', () => {
    for (const card of cards) card.isShown = null;
    update();
});

update();
if (collection.isFirstVisit && BOOSTER.openOnFirstVisit) booster.open({ isWelcome: true });
