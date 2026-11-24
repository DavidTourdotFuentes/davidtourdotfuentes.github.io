// Sauvegarde du joueur, gardée dans son navigateur : cartes possédées, pièces et boosters gratuits.

const LEGACY_KEY = 'portfolio-cards'; // ancienne sauvegarde : simple liste des cartes découvertes

const isCount = (value) => Number.isInteger(value) && value > 0;

export class Player {
    #owned = new Map(); // carte → nombre d'exemplaires
    #known = new Set(); // cartes possédées un jour : la prime de découverte n'est donnée qu'une fois
    #now;

    /** rules : { gameId, economy, trade }. now est remplaçable pour les tests. */
    constructor(cards, rules, now = Date.now) {
        this.cards = cards;
        this.rules = rules;
        this.#now = now;
        this.load();
    }

    get #key() {
        return `tcg-${this.rules.gameId}`;
    }

    // --- Lecture et écriture ---

    load() {
        this.#owned.clear();
        this.#known.clear();
        this.isFirstVisit = true;
        this.coins = this.rules.economy.startCoins;
        this.free = { stock: this.rules.economy.freeBooster.start, at: this.#now() };
        this.id = crypto.randomUUID?.() ?? String(Math.random()); // pour ne pas échanger avec soi-même
        this.name = ''; // pseudo montré pendant un échange

        let saved = null;
        let legacy = null;
        try {
            saved = JSON.parse(localStorage.getItem(this.#key));
            legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
        } catch {
            // Stockage bloqué ou illisible : la partie ne dure que le temps de la visite.
        }

        if (saved && typeof saved === 'object') {
            this.isFirstVisit = false;
            for (const card of this.cards) if (isCount(saved.owned?.[card.id])) this.#owned.set(card, saved.owned[card.id]);
            for (const card of this.cards) if (this.has(card) || saved.known?.includes?.(card.id)) this.#known.add(card);
            if (Number.isFinite(saved.coins) && saved.coins >= 0) this.coins = saved.coins;
            if (Number.isInteger(saved.free?.stock) && Number.isFinite(saved.free?.at)) this.free = saved.free;
            if (typeof saved.id === 'string') this.id = saved.id;
            if (typeof saved.name === 'string') this.name = saved.name;
            // Anciennes offres par code : les cartes mises de côté reviennent.
            for (const offer of Object.values(saved.offers ?? {})) {
                const card = this.find(offer?.give);
                if (card) this.#give(card);
            }
        } else if (Array.isArray(legacy)) {
            this.isFirstVisit = false;
            for (const card of this.cards) if (legacy.includes(card.id)) this.#give(card);
        }
    }

    save() {
        this.isFirstVisit = false;
        try {
            localStorage.setItem(this.#key, JSON.stringify({
                owned: Object.fromEntries([...this.#owned].map(([card, count]) => [card.id, count])),
                known: [...this.#known].map((card) => card.id),
                coins: this.coins,
                free: this.free,
                id: this.id,
                name: this.name,
            }));
        } catch {
            // Même cas que dans load().
        }
    }

    /** Vrai si cette clé de stockage est celle de la sauvegarde (changement fait dans un autre onglet). */
    owns(key) {
        return key === this.#key;
    }

    reset() {
        try {
            localStorage.removeItem(this.#key);
            localStorage.removeItem(LEGACY_KEY);
        } catch {
            // Même cas que dans load().
        }
        this.load();
        this.save();
    }

    // --- Cartes ---

    find(id) {
        return this.cards.find((card) => card.id === id);
    }

    count(card) {
        return this.#owned.get(card) ?? 0;
    }

    has(card) {
        return this.count(card) > 0;
    }

    /** Exemplaires en double : on garde toujours le premier. */
    spare(card) {
        return Math.max(this.count(card) - 1, 0);
    }

    get discovered() {
        return this.#owned.size;
    }

    get isComplete() {
        return this.discovered === this.cards.length;
    }

    #give(card) {
        this.#owned.set(card, this.count(card) + 1);
        this.#known.add(card);
    }

    #take(card) {
        if (this.count(card) > 1) this.#owned.set(card, this.count(card) - 1);
        else this.#owned.delete(card);
    }

    /** Ajoute des cartes ; une carte découverte pour la première fois rapporte une prime. Renvoie [{ card, isNew, reward }]. */
    receive(cards) {
        const results = cards.map((card) => {
            const isNew = !this.has(card);
            const reward = this.#known.has(card) ? 0 : this.rules.economy.discoverReward[card.rarity.id] ?? 0;
            this.#give(card);
            this.coins += reward;
            return { card, isNew, reward };
        });
        this.save();
        return results;
    }

    revealAll() {
        for (const card of this.cards) if (!this.has(card)) this.#give(card);
        this.save();
    }

    // --- Boosters ---

    /** Recharge les boosters gratuits écoulés depuis la dernière fois. */
    #refill() {
        const { every, max } = this.rules.economy.freeBooster;
        const period = every * 60_000;
        const now = this.#now();
        if (this.free.at > now) this.free.at = now; // horloge de l'ordinateur reculée
        const gained = Math.floor((now - this.free.at) / period);
        if (this.free.stock + gained >= max) this.free = { stock: Math.max(this.free.stock, max), at: now };
        else if (gained > 0) this.free = { stock: this.free.stock + gained, at: this.free.at + gained * period };
    }

    get freeBoosters() {
        this.#refill();
        return this.free.stock;
    }

    /** Millisecondes avant le prochain booster gratuit, 0 si la réserve est pleine. */
    get nextFreeIn() {
        this.#refill();
        const { every, max } = this.rules.economy.freeBooster;
        return this.free.stock >= max ? 0 : this.free.at + every * 60_000 - this.#now();
    }

    get canOpenBooster() {
        return this.freeBoosters > 0 || this.coins >= this.rules.economy.boosterPrice;
    }

    /** Paie un booster, gratuit si possible. Renvoie false si c'est impossible. */
    payBooster() {
        if (!this.canOpenBooster) return false;
        if (this.free.stock > 0) this.free = { ...this.free, stock: this.free.stock - 1 };
        else this.coins -= this.rules.economy.boosterPrice;
        this.save();
        return true;
    }

    // --- Revente ---

    sellPrice(card) {
        return this.rules.economy.sellPrice[card.rarity.id] ?? 0;
    }

    /** Vend jusqu'à amount doubles d'une carte. Renvoie les pièces gagnées. */
    sell(card, amount = 1) {
        const sold = Math.min(amount, this.spare(card));
        for (let i = 0; i < sold; i++) this.#take(card);
        const earned = sold * this.sellPrice(card);
        this.coins += earned;
        this.save();
        return earned;
    }

    /** Valeur de tous les doubles. */
    get spareValue() {
        return this.cards.reduce((sum, card) => sum + this.spare(card) * this.sellPrice(card), 0);
    }

    sellAllSpares() {
        return this.cards.reduce((sum, card) => sum + this.sell(card, this.spare(card)), 0);
    }

    // --- Échanges (voir trade.js) ---

    canTrade(card) {
        return this.rules.trade.allowLastCopy ? this.has(card) : this.spare(card) > 0;
    }

    /** Donne une carte et en reçoit une autre. */
    trade(given, received) {
        this.#take(given);
        return this.receive([received])[0];
    }
}
