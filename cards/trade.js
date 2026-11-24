// Déroulement d'un échange entre deux joueurs reliés par un canal (voir room.js). Aucun affichage ici.
//
// Chacun pose une carte, puis se déclare prêt. Quand les deux le sont, l'hôte lance l'échange (commit), l'invité
// l'applique et le confirme (done), puis l'hôte l'applique à son tour. Changer de carte annule les deux « prêt ».
//
// Les joueurs ne passent par aucun serveur : rien n'empêche l'un d'eux de tricher sur ce qu'il possède.

const COMMIT_TIMEOUT = 8000;
export const NAME_LENGTH = 20;

function newId() {
    return [...crypto.getRandomValues(new Uint8Array(9))].map((byte) => byte.toString(36).padStart(2, '0')).join('');
}

export class TradeSession {
    #channel;
    #player;
    #isHost;
    #events;
    #pending = null; // échange lancé par l'hôte : { id, mine, theirs, timer }
    #isOver = false;

    /**
     * events : onUpdate() à chaque changement, onRequest(card) quand l'autre demande une carte,
     * onDone({ given, received }) après un échange, onNotice(key) pour un incident sans gravité, onEnd(key) quand tout s'arrête.
     */
    constructor({ player, channel, isHost, events }) {
        this.#player = player;
        this.#channel = channel;
        this.#isHost = isHost;
        this.#events = events;
        this.mine = { card: null, ready: false };
        this.theirs = { card: null, ready: false, name: '', cards: null }; // cards : ce que l'autre peut échanger
        channel.onMessage = (message) => this.#receive(message);
        channel.onClose = () => this.#end('room_error_left');
        channel.send({
            type: 'hello',
            game: player.rules.gameId,
            player: player.id,
            name: player.name,
            cards: this.#tradable,
        });
    }

    /** Vrai quand l'autre joueur s'est présenté. */
    get isOpen() {
        return this.theirs.cards !== null;
    }

    get isCommitting() {
        return this.#pending !== null;
    }

    get #tradable() {
        return this.#player.cards.filter((card) => this.#player.canTrade(card)).map((card) => card.id);
    }

    // --- Actions du joueur ---

    select(card) {
        if (this.isCommitting || (card && !this.#player.canTrade(card))) return;
        this.mine = { card, ready: false };
        this.theirs.ready = false;
        this.#channel.send({ type: 'select', card: card?.id ?? null });
        this.#events.onUpdate();
    }

    /** Demande à l'autre joueur de poser une de ses cartes. */
    request(card) {
        this.#channel.send({ type: 'request', card: card.id });
    }

    setReady(ready) {
        if (this.isCommitting || (ready && !(this.mine.card && this.theirs.card))) return;
        this.mine.ready = ready;
        // Les deux cartes sont rappelées : l'accord ne vaut que pour cet échange précis.
        this.#channel.send({ type: 'ready', ready, give: this.mine.card?.id, get: this.theirs.card?.id });
        this.#tryCommit();
        this.#events.onUpdate();
    }

    /** La collection a changé (vente dans un autre onglet…). */
    refresh() {
        if (this.mine.card && !this.#player.canTrade(this.mine.card)) this.select(null);
        this.#channel.send({ type: 'cards', cards: this.#tradable });
    }

    leave() {
        this.#isOver = true;
        clearTimeout(this.#pending?.timer);
        this.#channel.close();
    }

    // --- Messages de l'autre joueur ---

    #receive(message) {
        if (this.#isOver) return;
        const { type } = message;
        if (type === 'full') this.#end('room_error_full');
        else if (type === 'hello') this.#welcome(message);
        else if (!this.isOpen) return; // pas encore présenté
        else if (type === 'cards') this.#setCards(message.cards);
        else if (type === 'select') this.#theirSelect(message.card);
        else if (type === 'request') this.#theirRequest(message.card);
        else if (type === 'ready') this.#theirReady(message);
        else if (type === 'commit') this.#applyCommit(message);
        else if (type === 'done') this.#finish(message.id);
        else if (type === 'abort') this.#abort();
        else return;
        if (!this.#isOver) this.#events.onUpdate();
    }

    #welcome({ game, player, name, cards }) {
        if (game !== this.#player.rules.gameId) this.#end('room_error_game');
        else if (player === this.#player.id) this.#end('room_error_self');
        else {
            this.theirs.name = String(name ?? '').slice(0, NAME_LENGTH);
            this.#setCards(cards);
        }
    }

    #setCards(ids) {
        this.theirs.cards = Array.isArray(ids) ? this.#player.cards.filter((card) => ids.includes(card.id)) : [];
    }

    #theirSelect(id) {
        if (this.isCommitting) return;
        this.theirs.card = this.#player.find(id) ?? null;
        this.theirs.ready = false;
        this.mine.ready = false;
    }

    #theirRequest(id) {
        const card = this.#player.find(id);
        if (card && this.#player.canTrade(card)) this.#events.onRequest(card);
    }

    #theirReady({ ready, give, get }) {
        if (this.isCommitting) return;
        this.theirs.ready = ready === true && give === this.theirs.card?.id && get === this.mine.card?.id;
        this.#tryCommit();
    }

    // --- Échange ---

    #tryCommit() {
        if (!this.#isHost || this.isCommitting || !this.mine.ready || !this.theirs.ready) return;
        const mine = this.mine.card;
        const theirs = this.theirs.card;
        if (!this.#player.canTrade(mine)) {
            this.select(null);
            return;
        }
        const id = newId();
        const timer = setTimeout(() => this.#end('room_error_left'), COMMIT_TIMEOUT);
        this.#pending = { id, mine, theirs, timer };
        this.#channel.send({ type: 'commit', id, give: mine.id, get: theirs.id });
    }

    /** Côté invité. */
    #applyCommit({ id, give, get }) {
        const { mine, theirs } = this;
        const isAgreed = !this.#isHost && mine.ready && mine.card && give === theirs.card?.id && get === mine.card.id
            && this.#player.canTrade(mine.card);
        if (!isAgreed) {
            this.#channel.send({ type: 'abort' });
            this.#abort();
            return;
        }
        this.#channel.send({ type: 'done', id });
        this.#swap(mine.card, theirs.card);
    }

    /** Côté hôte. */
    #finish(id) {
        if (!this.#pending || this.#pending.id !== id) return;
        const { mine, theirs, timer } = this.#pending;
        clearTimeout(timer);
        this.#pending = null;
        this.#swap(mine, theirs);
    }

    #swap(given, card) {
        const received = this.#player.trade(given, card);
        this.mine = { card: null, ready: false };
        this.theirs.card = null;
        this.theirs.ready = false;
        this.#events.onDone({ given, received });
        this.refresh();
    }

    #abort() {
        clearTimeout(this.#pending?.timer);
        this.#pending = null;
        this.mine.ready = false;
        this.theirs.ready = false;
        this.#events.onNotice('trade_aborted');
    }

    #end(key) {
        if (this.#isOver) return;
        this.leave();
        this.#events.onEnd(key);
    }
}
