// La conduite : toute la collection en liste, lisible sans ouvrir de booster.
import { el, setText } from './card.js';
import { createKnob } from './meter.js';

/** onOpen(card, origin) reçoit aussi l'élément d'où la carte doit sortir. */
export function createCueList(list, { cards, describe, onOpen }) {
    function render() {
        list.replaceChildren(...cards.map((card, i) => {
            const { name, role, year } = describe(card);
            const knob = createKnob(card.rarity);
            const roleNode = el('span', 'cue__role', { textContent: role });
            if (!role) setText(roleNode, `type_${card.type}`);
            const rarity = el('span');
            setText(rarity, `rarity_${card.rarity.id}`);
            const row = el('button', 'cue', { type: 'button' },
                el('span', 'cue__number', { textContent: i + 1 }),
                el('span', 'cue__name', { textContent: name }),
                roleNode,
                el('span', 'cue__year', { textContent: year }),
                el('span', 'cue__level', {}, knob, rarity));
            row.dataset.rarity = card.rarity.id;
            row.addEventListener('click', () => onOpen(card, knob));
            return el('li', '', {}, row);
        }));
    }
    return { render };
}
