// Cartes découvertes (gardées dans le navigateur du visiteur) et tirage des boosters.

const STORAGE_KEY = 'portfolio-cards';

function pickOne(list, random) {
    return list[Math.floor(random() * list.length)];
}

/** Chaque carte a une chance égale au poids de sa rareté. */
function pickWeighted(cards, random) {
    let roll = random() * cards.reduce((sum, card) => sum + card.rarity.weight, 0);
    return cards.find((card) => (roll -= card.rarity.weight) < 0) ?? cards[cards.length - 1];
}

/** Mélange de Fisher-Yates. */
function shuffle(list, random) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Tire un booster sans doublon parmi pool (cartes non découvertes). Une carte : { id, isProject, rarity } ;
 * rarity.level augmente avec la rareté. L'ordre est mélangé : la plus rare peut sortir à n'importe quel moment.
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

    // Un booster mélange projets et logiciels tant qu'il reste des deux : une carte au hasard cède sa place,
    // sauf si c'est la seule à tenir la garantie.
    const others = left.filter((card) => card.isProject !== picks[0]?.isProject);
    if (picks.length > 1 && others.length && picks.every((card) => card.isProject === picks[0].isProject)) {
        const holders = guaranteed ? picks.filter((card) => card.rarity.level >= guaranteed.level) : [];
        const removable = picks.filter((card) => holders.length !== 1 || card !== holders[0]);
        picks.splice(picks.indexOf(pickOne(removable, random)), 1);
        take(others);
    }
    return shuffle(picks, random);
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
