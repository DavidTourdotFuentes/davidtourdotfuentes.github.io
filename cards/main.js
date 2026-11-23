// Relie les cartes au site : les grilles ne montrent que les cartes découvertes.
// Fonctions de app.js et translations.js utilisées ici : getTranslation, applyTranslations, lockScroll, unlockScroll.
import { createBooster } from './booster.js';
import { createCard, el, text, waveform } from './card.js';
import { createDetail } from './detail.js';
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
        const { title, i18nDesc, i18nLong, icon, bg, embedType, iframe } = card.node.dataset;
        const [name, ...rest] = getTranslation(title).split(' : ');
        return {
            name,
            subtitle: rest.join(' : '),
            html: getTranslation(i18nDesc),
            longHtml: getTranslation(i18nLong),
            image: icon,
            background: bg,
            embed: { type: embedType, src: iframe },
        };
    }
    const { name, textKey, image } = card.tool;
    const html = getTranslation(textKey);
    return { name, subtitle: '', html, longHtml: html, image, background: '', embed: {} };
}

// --- Grilles ---

function placeholder() {
    return el('div', 'hidden-card', {},
        waveform(),
        el('span', 'hidden-card__mark', { textContent: '?' }),
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
    node.replaceChildren(face, text('span', 'new-tag', 'cards_new'));
}

const detail = createDetail({ cards, describe });
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
const count = el('strong', 'collection__count');
const progress = el('progress', 'collection__progress', { max: cards.length });
const chips = el('div', 'collection__chips');
const openButton = text('button', 'booster__btn booster__btn--main', 'cards_open_booster');
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

const floating = el('button', 'floating-booster', { type: 'button' }, waveform(), text('span', '', 'cards_open_booster'));
floating.addEventListener('click', () => booster.open());

const label = el('p', 'collection__label', {}, text('span', '', 'cards_collection'), ' ', count);
bar.append(el('div', 'collection__main', {}, label, progress, chips), el('div', 'collection__actions', {}, openButton, revealLink, resetLink));
document.body.append(floating);

function update() {
    cards.forEach(showCard);
    const isComplete = collection.count === cards.length;
    count.textContent = `${collection.count} / ${cards.length}`;
    progress.value = collection.count;
    progress.setAttribute('aria-label', label.textContent);
    chips.replaceChildren(...rarities.map((rarity) => {
        const all = cards.filter((card) => card.rarity === rarity);
        const found = all.filter((card) => collection.has(card)).length;
        const chip = el('span', 'collection__chip', {}, text('span', '', `rarity_${rarity.id}`), ` ${found}/${all.length}`);
        chip.style.setProperty('--rarity', rarity.color);
        return chip;
    }));
    openButton.hidden = floating.hidden = isComplete;
    revealLink.hidden = isComplete || !BOOSTER.allowRevealAll;
    resetLink.hidden = collection.count === 0;
    applyTranslations(translations);
}

function revealAll() {
    collection.add(cards);
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
        return drawn;
    },
    onRevealAll: BOOSTER.allowRevealAll ? revealAll : null,
    onClose(opened) {
        collection.save(); // le booster de bienvenue n'est proposé qu'une fois
        update();
        if (opened) document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
    },
});

// Les textes des cartes sont écrits à leur création : on les refait quand la langue change.
document.addEventListener('translationschange', () => {
    for (const card of cards) card.isShown = null;
    update();
});

update();
if (collection.isFirstVisit && BOOSTER.openOnFirstVisit) booster.open({ isWelcome: true });
