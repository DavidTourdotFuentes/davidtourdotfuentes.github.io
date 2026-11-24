// Fenêtre d'échange en direct : le salon où l'on invite ou rejoint un ami, puis la table où chacun pose une carte.
import { actionButton, burst, coins, createCard, el, reducedMotion, setText, text, waveform } from './card.js';
import { createModal } from './modal.js';
import { cleanCode, CODE_LENGTH, createRoom, joinRoom, qrCode, RoomError } from './room.js';
import { NAME_LENGTH, TradeSession } from './trade.js';

const SWAP = 700; // durée du croisement des deux cartes, en millisecondes
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export function createTradeView({ player, describe, onChange }) {
    const { cards } = player;
    const { gameId, trade: { server } } = player.rules;
    const closeButton = el('button', 'detail__close', { type: 'button', textContent: '×' });
    const title = text('h2', 'trade__title', 'trade_title');
    title.id = 'trade-title';
    const body = el('div', 'trade__body');
    const overlay = el('div', 'trade', {}, el('div', 'trade__layout', {}, title, body), closeButton);
    overlay.setAttribute('aria-labelledby', 'trade-title');
    const modal = createModal(overlay, close);

    let visit = 0; // change à chaque écran : une réponse réseau en retard ne touche plus l'affichage
    let hangUp = () => {}; // coupe la liaison en cours
    let session = null;
    let table = null; // table affichée
    let firstCard = null; // carte à poser dès l'arrivée à la table

    const face = (card) => {
        const node = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length);
        node.classList.add('is-flipped');
        return node;
    };
    const message = (key, className = '') => text('p', `trade__message ${className}`, key);

    function setScreen(name, ...content) {
        visit++;
        overlay.dataset.screen = name;
        overlay.scrollTop = 0;
        body.replaceChildren(...content);
        return visit;
    }

    function leave() {
        session?.leave();
        session = table = null;
        hangUp();
        hangUp = () => {};
    }

    // --- 1. Le salon ---

    function showLobby(errorKey = '') {
        leave();
        const name = el('input', 'trade__input', { type: 'text', value: player.name, maxLength: NAME_LENGTH, autocomplete: 'nickname' });
        name.addEventListener('change', () => {
            player.name = name.value.trim();
            player.save();
        });
        const label = el('label', 'trade__name', {}, text('span', '', 'trade_name'), name);

        const code = el('input', 'trade__input trade__input--code', {
            type: 'text', maxLength: CODE_LENGTH, autocomplete: 'off', spellcheck: false, placeholder: '•'.repeat(CODE_LENGTH),
        });
        code.setAttribute('aria-label', getTranslation('trade_code'));
        const join = actionButton('trade_join', 'booster__btn', () => showJoining(code.value));
        join.type = 'submit';
        join.disabled = true;
        code.addEventListener('input', () => {
            code.value = cleanCode(code.value);
            join.disabled = code.value.length < CODE_LENGTH;
        });
        const form = el('form', 'trade__form', {}, code, join);
        form.addEventListener('submit', (event) => event.preventDefault()); // Entrée déclenche le bouton

        setScreen('lobby',
            message('trade_intro'),
            ...(errorKey ? [message(errorKey, 'is-error')] : []),
            label,
            el('div', 'trade__columns', {},
                el('section', 'trade__panel', {},
                    text('h3', 'trade__heading', 'trade_invite'),
                    message('trade_invite_text'),
                    actionButton('trade_invite_button', 'booster__btn booster__btn--main', showHosting)),
                el('section', 'trade__panel', {},
                    text('h3', 'trade__heading', 'trade_join_title'),
                    message('trade_join_text'),
                    form)));
    }

    const waiting = (key) => el('p', 'trade__waiting', {}, waveform(), text('span', '', key));

    async function showHosting() {
        leave();
        const content = el('div', 'trade__host', {}, waiting('trade_preparing'));
        const current = setScreen('wait', content, actionButton('trade_cancel', 'booster__link', () => showLobby()));
        let room;
        try {
            room = await createRoom({
                gameId,
                server,
                onGuest: (channel) => startSession(channel, true),
                onError: (key) => { if (current === visit) showLobby(key); },
            });
        } catch (error) {
            if (current === visit) showLobby(roomError(error));
            return;
        }
        if (current !== visit) { // annulé pendant la préparation
            room.close();
            return;
        }
        hangUp = room.close;

        const link = `${location.origin}${location.pathname}#room=${room.code}`;
        const qr = el('div', 'trade__qr');
        content.replaceChildren(
            message('trade_share_text'),
            el('div', 'trade__invite', {}, qr, el('div', '', {},
                text('p', 'trade__label', 'trade_code'),
                el('p', 'trade__roomcode', { textContent: room.code }),
                shareButton(link))),
            waiting('trade_waiting'));
        qr.innerHTML = await qrCode(link) ?? '';
        qr.hidden = !qr.innerHTML;
    }

    /** Menu de partage du téléphone s'il existe, sinon copie du lien d'invitation. */
    function shareButton(link) {
        if (navigator.share) {
            return actionButton('trade_share', 'booster__btn booster__btn--main', () => {
                navigator.share({ title: document.title, text: getTranslation('trade_share_message'), url: link }).catch(() => {}); // partage annulé
            });
        }
        const button = actionButton('trade_copy', 'booster__btn booster__btn--main', async () => {
            try {
                await navigator.clipboard.writeText(link);
                setText(button.firstChild, 'trade_copied');
            } catch {
                window.prompt(getTranslation('trade_copy'), link); // copie refusée par le navigateur
            }
        });
        return button;
    }

    async function showJoining(input) {
        leave();
        const code = cleanCode(input);
        if (code.length < CODE_LENGTH) {
            showLobby('room_error_missing');
            return;
        }
        const current = setScreen('wait', el('div', 'trade__host', {}, waiting('trade_joining')), actionButton('trade_cancel', 'booster__link', () => showLobby()));
        const joining = joinRoom({ gameId, server, code });
        hangUp = joining.cancel;
        try {
            const channel = await joining.ready;
            if (current === visit && channel) startSession(channel, false);
            else channel?.close();
        } catch (error) {
            if (current === visit) showLobby(roomError(error));
        }
    }

    function roomError(error) {
        if (!(error instanceof RoomError)) console.error(error);
        return error instanceof RoomError ? error.key : 'room_error_network';
    }

    // --- 2. La table ---

    function startSession(channel, isHost) {
        hangUp = () => channel.close();
        const created = new TradeSession({
            player,
            channel,
            isHost,
            events: {
                onUpdate() {
                    if (session !== created || !created.isOpen) return;
                    if (!table) {
                        table = createTable(created);
                        if (firstCard) created.select(firstCard);
                        firstCard = null;
                    }
                    table.render();
                },
                onRequest: (card) => table?.request(card),
                onNotice: (key) => table?.notice(key),
                onDone: (result) => table?.finish(result),
                onEnd(key) {
                    if (session !== created) return;
                    session = null;
                    if (table?.isShowingResult) table.lost(); // on laisse voir la carte reçue
                    else showLobby(key);
                },
            },
        });
        session = created;
    }

    function createTable(trade) {
        const partner = () => trade.theirs.name || getTranslation('trade_partner');
        const requested = new Set(); // cartes que l'autre demande
        const asked = new Set(); // cartes qu'on lui demande
        let isBusy = false; // croisement des cartes ou résultat à l'écran

        const slots = { mine: slot('trade_you'), theirs: slot('') };
        slots.theirs.label.textContent = partner();
        const status = el('p', 'swap__status');
        status.setAttribute('aria-live', 'polite');
        const ready = actionButton('trade_ready', 'booster__btn booster__btn--main', () => trade.setReady(!trade.mine.ready));
        const myCards = el('div', 'picker');
        const theirCards = el('div', 'picker');
        const theirTitle = el('h3', 'trade__label');
        const screen = setScreen('table',
            el('div', 'swap', {}, slots.mine.node, el('div', 'swap__middle', {}, el('span', 'swap__arrows', { textContent: '⇄' }), ready), slots.theirs.node),
            status,
            el('div', 'trade__columns', {},
                el('section', 'trade__panel', {}, text('h3', 'trade__label', 'trade_my_cards'), myCards),
                el('section', 'trade__panel', {}, theirTitle, theirCards)),
            actionButton('trade_leave', 'booster__link', () => showLobby()));

        function slot(labelKey) {
            const label = labelKey ? text('p', 'swap__name', labelKey) : el('p', 'swap__name');
            const place = el('div', 'swap__place');
            const node = el('div', 'swap__slot', {}, label, place);
            return { node, label, place, card: undefined };
        }

        function fillSlot(target, { card, ready: isReady }, emptyKey) {
            target.node.classList.toggle('is-ready', isReady);
            if (target.card === card) return;
            target.card = card;
            target.place.replaceChildren(card ? face(card) : el('div', 'swap__empty', {}, waveform(), text('span', '', emptyKey)));
        }

        /** Grille de cartes ; n'est refaite que si la liste change, pour ne pas perdre le défilement ni le focus. */
        function fillPicker(grid, list, { state, onPick, badge, emptyKey }) {
            const key = list.map((card) => `${card.id}${badge(card)}${player.has(card)}`).join();
            if (grid.dataset.key !== key) {
                grid.dataset.key = key;
                grid.replaceChildren(...list.map((card) => {
                    const isHidden = !player.has(card); // jamais découverte : elle reste face cachée
                    const number = `${cards.indexOf(card) + 1}/${cards.length}`;
                    const content = isHidden ? el('span', 'picker__hidden', {}, '?', el('small', '', { textContent: number })) : face(card);
                    const option = el('button', 'picker__option', { type: 'button' }, content, text('span', 'picker__flag', 'trade_requested'));
                    option.style.setProperty('--rarity', card.rarity.color);
                    option.setAttribute('aria-label', isHidden ? `${getTranslation('cards_hidden')} ${number}` : describe(card).name);
                    option.dataset.id = card.id;
                    if (badge(card)) option.append(el('span', 'count-tag', { textContent: badge(card) }));
                    option.addEventListener('click', () => onPick(card));
                    return option;
                }));
                if (!list.length) grid.append(message(emptyKey));
            }
            for (const option of grid.querySelectorAll('.picker__option')) {
                const { pressed, flagged } = state(player.find(option.dataset.id));
                option.setAttribute('aria-pressed', pressed);
                option.classList.toggle('is-requested', flagged);
            }
        }

        function statusKey() {
            if (trade.isCommitting) return 'trade_status_going';
            if (!trade.mine.card) return 'trade_status_pick';
            if (!trade.theirs.card) return 'trade_status_wait_card';
            if (trade.mine.ready) return 'trade_status_wait_ready';
            return trade.theirs.ready ? 'trade_status_their_ready' : 'trade_status_confirm';
        }

        function render() {
            if (isBusy || screen !== visit) return;
            const { mine, theirs } = trade;
            slots.theirs.label.textContent = partner();
            theirTitle.textContent = `${getTranslation('trade_their_cards')} ${partner()}`;
            fillSlot(slots.mine, mine, 'trade_slot_mine');
            fillSlot(slots.theirs, theirs, 'trade_slot_theirs');
            fillPicker(myCards, cards.filter((card) => player.canTrade(card)), {
                emptyKey: 'trade_no_card',
                badge: (card) => (player.count(card) > 1 ? `×${player.count(card)}` : ''),
                state: (card) => ({ pressed: card === mine.card, flagged: requested.has(card) }),
                onPick: (card) => trade.select(card === trade.mine.card ? null : card),
            });
            fillPicker(theirCards, theirs.cards, {
                emptyKey: 'trade_their_empty',
                badge: () => '',
                state: (card) => ({ pressed: card === theirs.card, flagged: asked.has(card) }),
                onPick(card) {
                    asked.add(card);
                    trade.request(card);
                    render();
                },
            });

            ready.disabled = trade.isCommitting || !mine.card || !theirs.card;
            setText(ready.firstChild, mine.ready ? 'trade_unready' : 'trade_ready');
            ready.classList.toggle('is-on', mine.ready);
            const isLastCopy = mine.card && player.count(mine.card) === 1 && !mine.ready;
            status.replaceChildren(text('span', '', statusKey()), ...(isLastCopy ? [text('span', 'swap__warning', 'trade_last_copy')] : []));
        }

        const self = {
            render,
            isShowingResult: false,
            request(card) {
                requested.add(card);
                render();
                const option = myCards.querySelector(`[data-id="${CSS.escape(card.id)}"]`);
                if (option) myCards.scrollTop = option.offsetTop - 10; // montre la carte demandée
            },
            notice(key) {
                if (!isBusy) status.replaceChildren(text('span', 'swap__warning', key));
            },
            async finish({ given, received }) {
                isBusy = true;
                self.isShowingResult = true;
                requested.delete(given);
                asked.delete(received.card);
                onChange([received]);
                // L'invité conclut parfois avant que son dernier clic soit affiché.
                fillSlot(slots.mine, { card: given, ready: true }, '');
                fillSlot(slots.theirs, { card: received.card, ready: true }, '');
                await swapCards();
                if (screen === visit) showResult(received);
            },
            lost() {
                const again = body.querySelector('[data-again]');
                if (again) again.replaceWith(message('room_error_left'));
                self.isLost = true;
            },
        };

        async function swapCards() {
            if (reducedMotion()) return;
            const from = slots.mine.place.getBoundingClientRect();
            const to = slots.theirs.place.getBoundingClientRect();
            const x = to.left - from.left;
            const y = to.top - from.top;
            const fly = (node, dx, dy, lift) => node.animate(
                [{ transform: 'none' }, { transform: `translate(${dx / 2}px, ${dy / 2 + lift}px) scale(1.08)` }, { transform: `translate(${dx}px, ${dy}px)` }],
                { duration: SWAP, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
            );
            fly(slots.mine.place.firstChild, x, y, -40);
            fly(slots.theirs.place.firstChild, -x, -y, 40);
            await wait(SWAP + 100);
        }

        function showResult({ card, isNew, reward }) {
            const fx = el('div', 'fx', {}, el('span', 'fx__rays'), el('span', 'fx__ring'));
            fx.dataset.effect = card.rarity.effect;
            fx.style.setProperty('--rarity', card.rarity.color);
            const stage = el('div', 'trade__result', {}, fx, face(card));
            const tag = el('p', `status-tag${isNew ? ' is-new' : ''}`, {}, text('span', '', isNew ? 'cards_new' : 'cards_double'));
            if (reward) tag.append(' ', coins(reward, '+'));
            const again = actionButton('trade_again', 'booster__btn booster__btn--main', () => {
                // Retour à la table avec le même joueur.
                table = createTable(trade);
                table.render();
            });
            again.dataset.again = '';
            setScreen('result',
                text('p', 'trade__heading', 'trade_success'),
                stage,
                tag,
                el('div', 'booster__actions', {}, again, actionButton('cards_see_collection', 'booster__btn', close)));
            fx.classList.add('is-active');
            burst(stage, { ...card.rarity, particles: Math.max(card.rarity.particles, 16) });
            if (self.isLost) self.lost();
            overlay.focus({ preventScroll: true });
        }

        return self;
    }

    // --- Ouverture et fermeture ---

    function open({ give = null, code = '' } = {}) {
        if (!overlay.hidden) return;
        firstCard = give;
        closeButton.setAttribute('aria-label', getTranslation('cards_close'));
        player.save(); // garde l'identifiant du joueur
        modal.open();
        if (code) showJoining(code);
        else showLobby();
        closeButton.focus({ preventScroll: true });
    }

    function close() {
        if (overlay.hidden) return;
        leave();
        setScreen('closed');
        modal.close();
    }

    closeButton.addEventListener('click', close);
    return { open, refresh: () => session?.refresh() };
}
