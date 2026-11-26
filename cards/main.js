// Relie les cartes au site : les grilles ne montrent que les cartes découvertes.
// Fonctions de app.js et translations.js utilisées ici : getTranslation, applyTranslations, currentLang, lockScroll, unlockScroll.
import { createBooster } from './booster.js';
import { createCard, el, iconButton, text } from './card.js';
import { createCelebration } from './celebrate.js';
import { createConfirm } from './confirm.js';
import { createDetail } from './detail.js';
import { attachTip } from './tip.js';
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

/** Bannière de la timeline : banner est un chemin, ou { image, focus } ; sans banner, l'image de la carte. */
function bannerOf({ banner, image }) {
    const { image: src = image, focus } = typeof banner === 'string' ? { image: banner } : banner ?? {};
    return { image: src, focus: focus === undefined ? '' : `${focus}%` };
}

/** Contenu d'une carte, dans la langue courante. */
function describe({ data }) {
    const get = (value) => textOf(value, currentLang);
    const short = get(data.short);
    return {
        name: get(data.name),
        role: get(data.role),
        label: get(data.label),
        kind: data.kind,
        links: (data.links ?? []).map((link) => ({ url: link.url, label: get(link.label) })),
        refs: data.refs ?? [],
        year: data.year ? String(data.year) : '',
        html: toHtml(short),
        longHtml: toHtml(get(data.long) || short),
        image: data.image,
        crop: data.crop === undefined ? '' : `${data.crop}%`,
        zoom: data.zoom,
        banner: bannerOf(data),
        fullArt: data.fullArt ?? '',
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

const detail = createDetail({ cards, describe, has: (card) => collection.has(card) });
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
    onRevealAll: BOOSTER.allowRevealAll ? askRevealAll : null,
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

// --- Filtres : un sélecteur au-dessus d'une grille. options : [valeur, clé de traduction] ; la première montre tout ---

function createFilters(group, grid, options, matches) {
    for (const [value, key] of options) {
        const button = text('button', 'filter-btn', key);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(!value));
        button.setAttribute('aria-controls', grid.id); // le filtre agit sur la grille juste en dessous
        button.addEventListener('click', () => {
            for (const other of group.children) other.setAttribute('aria-pressed', String(other === button));
            for (const card of cards) if (grid.contains(card.node)) card.node.hidden = Boolean(value) && !matches(card.data, value);
        });
        group.append(button);
    }
}
// Projets : par métier (tags)
createFilters(document.getElementById('filters'), document.getElementById('project-grid'),
    [['', 'filter_projects_all'], ...Object.entries(TAGS)], (data, tag) => data.tags?.includes(tag));
// Compétences : savoir-faire ou logiciels (kind)
createFilters(document.getElementById('skill-filters'), document.getElementById('skill-grid'),
    [['', 'filter_all'], ['skill', 'filter_skills'], ['software', 'filter_software']], (data, value) => (data.kind ?? 'skill') === value);

// --- Barre de collection ---

const bar = document.getElementById('collection');
// Progression : une graduation par carte, les plus rares dans le rouge.
const legendaries = cards.filter((card) => card.rarity === rarities.at(-1)).length;
const meter = createMeter({ ticks: cards.length + 1, red: cards.length - legendaries, labels: [], crete: 'var(--crete)', needle: 'var(--aiguille)' });
const count = el('span', ''); // « 10 / 33 Cartes »
const gauge = el('div', 'gauge', {}, meter, el('strong', 'gauge__count', {}, count, ` / ${cards.length} `, text('span', '', 'meter_cards')));
// Les raretés, chacune avec son potard : une légende, sans compte (le total est dans la jauge).
// Ensemble, elles ouvrent une note qui justifie le classement : rarity_note_title et rarity_note (les points, séparés par |) dans translations.csv.
const legend = el('button', 'collection__chips', { type: 'button' }, ...rarities.map((rarity) => {
    const chip = el('span', 'collection__chip', {}, createKnob(rarity), text('span', '', `rarity_${rarity.id}`));
    chip.dataset.rarity = rarity.id;
    return chip;
}));
const note = attachTip(legend, (box) => {
    const points = getTranslation('rarity_note').split('|').map((point) => point.trim()).filter(Boolean);
    box.replaceChildren(el('p', 'tip__title', { textContent: getTranslation('rarity_note_title') }),
        el('ul', 'tip__list', {}, ...points.map((point) => el('li', '', { textContent: point }))));
});
const chips = el('div', 'collection__rarities', {}, legend, note);

// Recommencer efface toute la collection : un vrai bouton, comme Tout révéler, et une confirmation
const resetButton = iconButton('cards_reset', 'reset', 'btn btn--line', askResetAll);
const resetConfirm = createConfirm('confirm_reset');


const floating = el('button', 'floating-booster', { type: 'button' }, text('span', '', 'cards_open_booster'));
floating.addEventListener('click', () => booster.open());

// Recommencer : au bout de la ligne des raretés
bar.append(el('div', 'collection__main', {}, gauge, chips, resetButton)); // les boosters s'ouvrent au cadran et par le paquet flottant
document.body.append(floating);

// Inutile près du cadran, qui a son propre bouton, et il gênerait la page contact.
const inView = new Set();
const tuck = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) inView[isIntersecting ? 'add' : 'delete'](target);
    floating.classList.toggle('is-tucked', inView.size > 0);
});
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
    floating.hidden = isComplete;
    resetButton.hidden = collection.count === 0;
    applyTranslations(translations);
}

async function askResetAll() {
    if (await resetConfirm.ask()) resetAll();
}

function resetAll() {
    forgetCelebration();
    newCards.clear();
    collection.reset();
    update();
    booster.open();
}

// Tout révéler gâche la découverte : on demande d'abord.
const revealConfirm = createConfirm('confirm_reveal_all');

/** Renvoie une promesse : true si le visiteur a dit Oui et que tout est révélé. */
async function askRevealAll() {
    if (!(await revealConfirm.ask())) return false;
    revealAll();
    return true;
}

function revealAll() {
    collection.add(cards);
    dial.aimAt(cards.find((card) => card.rarity === rarities.at(-1)));
    update();
    celebrateIfComplete();
}

// --- Collection complète : la grande animation, une fois par collection terminée ---

const celebration = createCelebration();
const CELEBRATED = 'portfolio-complete-seen';

function celebrateIfComplete() {
    if (collection.count !== cards.length) return;
    try {
        if (localStorage.getItem(CELEBRATED)) return;
        localStorage.setItem(CELEBRATED, '1');
    } catch {
        // Stockage bloqué : elle se rejouera à la prochaine visite, ce n'est pas grave.
    }
    celebration.play(cards.length);
}

function forgetCelebration() {
    try {
        localStorage.removeItem(CELEBRATED);
    } catch {
        // Même cas que plus haut.
    }
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
    onRevealAll: BOOSTER.allowRevealAll ? askRevealAll : null,
    onClose(opened) {
        collection.save(); // le booster de bienvenue n'est proposé qu'une fois
        update();
        if (opened) document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
        if (opened && collection.count === cards.length) setTimeout(celebrateIfComplete, 650); // la dernière carte : on revient à la collection, puis tout explose
    },
});

// Les textes des cartes sont écrits à leur création : on les refait quand la langue change.
document.addEventListener('translationschange', () => {
    for (const card of cards) card.isShown = null;
    update();
});

update();
if (collection.isFirstVisit && BOOSTER.openOnFirstVisit) booster.open({ isWelcome: true });
