// Cartes découvertes (gardées dans le navigateur du visiteur) et tirage des boosters.

const STORAGE_KEY = 'portfolio-cards';

function pickOne(list, random) {
    return list[Math.floor(random() * list.length)];
}

/** Choisit d'abord une rareté selon son poids, parmi celles encore présentes, puis une carte de cette rareté. */
function pickWeighted(cards, random) {
    const rarities = [...new Set(cards.map((card) => card.rarity))];
    let roll = random() * rarities.reduce((sum, rarity) => sum + rarity.weight, 0);
    const rarity = rarities.find((candidate) => (roll -= candidate.weight) < 0) ?? rarities[rarities.length - 1];
    return pickOne(cards.filter((card) => card.rarity === rarity), random);
}

/**
 * Tire un booster sans doublon parmi pool (cartes non découvertes). Une carte : { id, isProject, rarity } ;
 * rarity.level augmente avec la rareté. Les plus rares sont à la fin, pour garder le suspense.
 */
export function drawBooster(pool, { size, guaranteed }, random = Math.random) {
    const left = [...pool];
    const picks = [];
    const take = (candidates) => {
        const card = pickWeighted(candidates, random);
        left.splice(left.indexOf(card), 1);
        picks.push(card);
    };

    while (picks.length < size && left.length) {
        const isLast = picks.length === size - 1;
        const best = isLast && guaranteed && !picks.some((card) => card.rarity.level >= guaranteed.level)
            ? left.filter((card) => card.rarity.level >= guaranteed.level)
            : [];
        take(best.length ? best : left);
    }

    // Un booster mélange projets et logiciels tant qu'il reste des deux : la carte la moins rare cède sa place.
    const others = left.filter((card) => card.isProject !== picks[0]?.isProject);
    if (picks.length > 1 && others.length && picks.every((card) => card.isProject === picks[0].isProject)) {
        picks.sort((a, b) => a.rarity.level - b.rarity.level);
        picks.shift();
        take(others);
    }
    return picks.sort((a, b) => a.rarity.level - b.rarity.level);
}

export class Collection {
    #discovered = new Set();

    constructor(cards) {
        this.cards = cards;
        this.isFirstVisit = true;
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(saved)) {
                this.isFirstVisit = false;
                const ids = new Set(saved);
                for (const card of cards) if (ids.has(card.id)) this.#discovered.add(card);
            }
        } catch {
            // Stockage bloqué ou illisible : la collection ne dure que le temps de la visite.
        }
    }

    has(card) {
        return this.#discovered.has(card);
    }

    get hidden() {
        return this.cards.filter((card) => !this.has(card));
    }

    get count() {
        return this.#discovered.size;
    }

    add(cards) {
        for (const card of cards) this.#discovered.add(card);
        this.save();
    }

    reset() {
        this.#discovered.clear();
        this.save();
    }

    save() {
        this.isFirstVisit = false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.#discovered].map((card) => card.id)));
        } catch {
            // Même cas que dans le constructeur.
        }
    }
}
