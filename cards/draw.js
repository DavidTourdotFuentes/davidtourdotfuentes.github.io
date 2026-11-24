// Tirage des boosters.

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
 * Tire un booster parmi pool, sans deux fois la même carte dans un booster. Une carte : { id, isProject, rarity } ;
 * rarity.level augmente avec la rareté. Les plus rares sont à la fin, pour garder le suspense.
 */
export function drawBooster(pool, { size, guaranteed, mixTypes }, random = Math.random) {
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
    const others = mixTypes ? left.filter((card) => card.isProject !== picks[0]?.isProject) : [];
    if (picks.length > 1 && others.length && picks.every((card) => card.isProject === picks[0].isProject)) {
        picks.sort((a, b) => a.rarity.level - b.rarity.level);
        picks.shift();
        take(others);
    }
    return picks.sort((a, b) => a.rarity.level - b.rarity.level);
}
