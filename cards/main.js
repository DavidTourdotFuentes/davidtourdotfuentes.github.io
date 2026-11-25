// Relie les cartes au site : les grilles ne montrent que les cartes découvertes.
// Fonctions de app.js et translations.js utilisées ici : getTranslation, applyTranslations, lockScroll, unlockScroll.
import { createBooster } from './booster.js';
import { createCard, el, text } from './card.js';
import { createCueList } from './cuelist.js';
import { createDetail } from './detail.js';
import { createDial } from './dial.js';
import { createKnob, createMeter, needleAngle } from './meter.js';
import { Collection, drawBooster } from './collection.js';
import { BOOSTER, CARDS, RARITIES } from './config.js';

const rarities = RARITIES.map((rarity, level) => ({ ...rarity, level }));
const findRarity = (id) => rarities.find((rarity) => rarity.id === id);

function readCard(node) {
    const id = node.dataset.card;
    const rarity = findRarity(CARDS[id] ?? rarities[0].id);
    if (!rarity) console.warn(`cards/config.js : rareté « ${CARDS[id]} » inconnue pour la carte « ${id} »`);
    const isProject = node.matches('.project-card');
    return {
        id,
        node,
        isProject,
        type: node.dataset.cardType ?? (isProject ? 'project' : 'software'), // data-card-type="hardware" pour du matériel
        rarity: rarity ?? rarities[0],
        isShown: null,
        tool: isProject ? null : {
            name: node.querySelector('h4').textContent,
            textKey: node.querySelector('[data-i18n]').dataset.i18n,
            image: node.querySelector('img').getAttribute('src'),
        },
    };
}

const cards = [...document.querySelectorAll('[data-card]')].map(readCard);
const collection = new Collection(cards);
const newCards = new Set(); // découvertes pendant cette visite

/** Contenu d'une carte, dans la langue courante. */
function describe(card) {
    if (card.isProject) {
        const { title, i18nDesc, i18nLong, icon, art, crop, zoom, embedType, iframe } = card.node.dataset;
        const [name, ...rest] = getTranslation(title).split(' : ');
        const subtitle = rest.join(' : ');
        const [, role = subtitle, year = ''] = subtitle.match(/^(.*?)\s*\((\d{4})\)$/) ?? [];
        return {
            name,
            role,
            year,
            html: getTranslation(i18nDesc),
            longHtml: getTranslation(i18nLong),
            image: art ?? icon, // data-art : image réduite et cadrée pour la carte
            crop,
            zoom,
            embed: { type: embedType, src: iframe },
        };
    }
    const { name, textKey, image } = card.tool;
    const html = getTranslation(textKey);
    return { name, role: '', year: '', html, longHtml: html, image, embed: {} };
}

// --- Grilles ---

/** Place d'une carte pas encore vue. */
function placeholder() {
    return el('div', 'hidden-card', {},
        el('span', 'hidden-card__mark', { textContent: '−∞' }),
        text('p', 'hidden-card__text', 'cards_hidden'));
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
        node.replaceChildren(placeholder());
        return;
    }
    const face = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length);
    face.classList.add('is-flipped');
    face.firstChild.append(text('span', 'new-tag', 'cards_new')); // fixée à la carte, pour s'incliner avec elle
    node.replaceChildren(face);
}

const detail = createDetail({ cards, describe });
const cueList = createCueList(document.getElementById('cuelist'), { cards, describe, onOpen: detail.open });
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

// --- Barre de collection ---

const bar = document.getElementById('collection');
// Progression : une graduation par carte, les plus rares dans le rouge.
const legendaries = cards.filter((card) => card.rarity === rarities.at(-1)).length;
const meter = createMeter({ ticks: cards.length + 1, red: cards.length - legendaries, labels: [], crete: 'var(--crete)', needle: 'var(--aiguille)' });
const count = el('strong', 'gauge__count');
const totalText = el('span', 'gauge__total', {}, text('span', '', 'meter_of'), ` ${cards.length} `, text('span', '', 'meter_cards'));
const gauge = el('div', 'gauge', {}, meter, el('div', 'gauge__text', {}, count, totalText));
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
const revealLink = link('cards_reveal_all', revealAll);
const resetLink = link('cards_reset', () => {
    if (!window.confirm(getTranslation('cards_reset_confirm'))) return;
    newCards.clear();
    collection.reset();
    update();
    booster.open();
});

const floating = el('button', 'floating-booster', { type: 'button' }, text('span', '', 'cards_open_booster'));
floating.addEventListener('click', () => booster.open());

bar.append(el('div', 'collection__main', {}, gauge, chips), el('div', 'collection__actions', {}, openButton, revealLink, resetLink));
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
    cueList.render();
    dial.update();
    const found = collection.count;
    meter.style.setProperty('--needle', `${needleAngle(found / cards.length)}deg`);
    const isWord = found === 0 || isComplete;
    count.replaceChildren(isWord ? '' : `${found} `, text('span', '', found === 0 ? 'meter_none' : isComplete ? 'meter_all' : found === 1 ? 'meter_one' : 'meter_many'));
    chips.replaceChildren(...rarities.map((rarity) => {
        const all = cards.filter((card) => card.rarity === rarity);
        const shown = all.filter((card) => collection.has(card)).length;
        const chip = el('span', 'collection__chip', {}, createKnob(rarity), text('span', '', `rarity_${rarity.id}`), ` ${shown}/${all.length}`);
        chip.dataset.rarity = rarity.id;
        return chip;
    }));
    openButton.hidden = floating.hidden = isComplete;
    revealLink.hidden = isComplete || !BOOSTER.allowRevealAll;
    resetLink.hidden = collection.count === 0;
    applyTranslations(translations);
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
