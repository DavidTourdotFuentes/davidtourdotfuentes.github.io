// Relie les cartes au site : les grilles ne montrent que les cartes découvertes.
// Fonctions de app.js et translations.js utilisées ici : getTranslation, applyTranslations, lockScroll, unlockScroll.
import { createBooster } from './booster.js';
import { actionButton, coins, createCard, el, text, waveform } from './card.js';
import { createDetail } from './detail.js';
import { BOOSTER, CARDS, ECONOMY, GAME_ID, RARITIES, TRADE } from './config.js';
import { drawBooster } from './draw.js';
import { Player } from './player.js';
import { createTradeView } from './trade-view.js';

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
const player = new Player(cards, { gameId: GAME_ID, economy: ECONOMY, trade: TRADE });
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
    const isShown = player.has(card);
    const { node, rarity } = card;
    node.classList.toggle('is-new', isShown && newCards.has(card));
    if (card.isShown === isShown) {
        showCount(card);
        return;
    }

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
    // Les étiquettes sont fixées à la carte, pour s'incliner avec elle.
    face.firstChild.append(text('span', 'new-tag', 'cards_new'), el('span', 'count-tag'));
    node.replaceChildren(face);
    showCount(card);
}

/** Nombre d'exemplaires, affiché à partir de deux. */
function showCount(card) {
    const tag = card.node.querySelector('.count-tag');
    if (!tag) return;
    tag.hidden = player.spare(card) === 0;
    tag.textContent = `×${player.count(card)}`;
}

const detail = createDetail({ player, describe, onChange: update, onTrade: (give) => trade.open({ give }) });
for (const card of cards) {
    const open = () => { if (player.has(card)) detail.open(card); };
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
const openButton = actionButton('cards_open_booster', 'booster__btn booster__btn--main', () => booster.open());
const sellButton = actionButton('sell_spares', 'booster__btn booster__btn--coins', () => {
    player.sellAllSpares();
    update();
});
const sellValue = el('span');
sellButton.append(' ', sellValue);
const tradeButton = actionButton('trade_open', 'booster__btn', () => trade.open());
const revealLink = actionButton('cards_reveal_all', 'booster__link', revealAll);
const resetLink = actionButton('cards_reset', 'booster__link', () => {
    if (!window.confirm(getTranslation('cards_reset_confirm'))) return;
    newCards.clear();
    player.reset();
    update();
    booster.open();
});

// Solde et booster, toujours visibles en bas de l'écran.
const balance = el('span', 'hud__coins');
const hudPrice = el('span', 'hud__price');
const hudButton = el('button', 'floating-booster', { type: 'button' }, waveform(), text('span', '', 'cards_open_booster'), hudPrice);
hudButton.addEventListener('click', () => booster.open());
document.body.append(el('div', 'hud', {}, balance, hudButton));

const label = el('p', 'collection__label', {}, text('span', '', 'cards_collection'), ' ', count);
bar.append(el('div', 'collection__main', {}, label, progress, chips), el('div', 'collection__actions', {}, openButton, tradeButton, sellButton, revealLink, resetLink));

function update() {
    cards.forEach(showCard);
    count.textContent = `${player.discovered} / ${cards.length}`;
    progress.value = player.discovered;
    progress.setAttribute('aria-label', label.textContent);
    chips.replaceChildren(...rarities.map((rarity) => {
        const all = cards.filter((card) => card.rarity === rarity);
        const found = all.filter((card) => player.has(card)).length;
        const chip = el('span', 'collection__chip', {}, text('span', '', `rarity_${rarity.id}`), ` ${found}/${all.length}`);
        chip.style.setProperty('--rarity', rarity.color);
        return chip;
    }));
    sellButton.hidden = player.spareValue === 0;
    sellValue.replaceChildren(coins(player.spareValue, '+'));
    revealLink.hidden = player.isComplete || !BOOSTER.allowRevealAll;
    resetLink.hidden = player.discovered === 0;
    showBalance();
    applyTranslations(translations);
}

let shownBalance = '';
/** Solde et prix du prochain booster ; rappelé chaque seconde pour le compte à rebours. */
function showBalance() {
    const free = player.freeBoosters;
    const canOpen = player.canOpenBooster;
    const seconds = Math.ceil(player.nextFreeIn / 1000);
    const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const state = `${player.coins}|${free}|${free ? '' : countdown}`;
    if (state === shownBalance) return;
    shownBalance = state;

    balance.replaceChildren(coins(player.coins));
    hudButton.disabled = openButton.disabled = !canOpen;
    if (free > 0) hudPrice.replaceChildren(text('span', '', 'booster_free'), ` ×${free}`);
    else if (canOpen) hudPrice.replaceChildren(coins(ECONOMY.boosterPrice));
    else hudPrice.replaceChildren(text('span', '', 'booster_next'), ` ${countdown}`);
}
setInterval(showBalance, 1000);

function revealAll() {
    player.revealAll();
    update();
}

/** Retient les cartes découvertes pendant cette visite. */
function received(results) {
    for (const { card, isNew } of results) if (isNew) newCards.add(card);
    return results;
}

// --- Boosters ---

const booster = createBooster({
    player,
    size: BOOSTER.size,
    describe,
    onChange: update,
    draw() {
        if (!player.payBooster()) return null;
        const drawn = drawBooster(cards, { size: BOOSTER.size, guaranteed: findRarity(BOOSTER.guaranteed), mixTypes: BOOSTER.mixTypes });
        return received(player.receive(drawn));
    },
    onRevealAll: BOOSTER.allowRevealAll ? revealAll : null,
    onClose(opened) {
        player.save(); // le booster de bienvenue n'est proposé qu'une fois
        update();
        if (openLinkedRoom()) return;
        if (opened) document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
    },
});

// Les textes des cartes sont écrits à leur création : on les refait quand la langue change.
document.addEventListener('translationschange', () => {
    for (const card of cards) card.isShown = null;
    update();
});

// --- Échanges ---

const trade = createTradeView({
    player,
    describe,
    onChange(results) {
        received(results);
        update();
    },
});

/** Rejoint le salon contenu dans l'adresse (#room=…), s'il y en a un. */
function openLinkedRoom() {
    const code = location.hash.match(/^#room=(\w+)/)?.[1];
    const isBusy = document.querySelector('[role="dialog"]:not([hidden])'); // une seule fenêtre à la fois
    if (!code || isBusy) return false;
    history.replaceState(null, '', location.pathname + location.search); // un rechargement ne le rejoint pas à nouveau
    trade.open({ code });
    return true;
}
window.addEventListener('hashchange', openLinkedRoom);

// La partie a continué dans un autre onglet.
window.addEventListener('storage', (event) => {
    if (!player.owns(event.key)) return;
    player.load();
    update();
    trade.refresh();
});

update();
if (player.isFirstVisit && BOOSTER.openOnFirstVisit) booster.open({ isWelcome: true });
else openLinkedRoom();
