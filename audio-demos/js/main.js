// Point d'entrée : lit le manifeste, le valide et construit le laboratoire.
// Les textes du manifeste sont des clés de ../translations.csv (voir README.md).
import { EngineError, engine } from './fmod-engine.js';
import { keepLanguage } from './i18n.js';
import { createScope } from './scope.js';
import {
    initialValue, perFrame, renderDemos, renderLamps, setBusy, setEventPlaying, setEventState, setLive, setStatus, showPageError,
} from './ui.js';
import { watchCards, watchPage } from './visibility.js';

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);

function validateParameter(p, at, errors) {
    if (!isText(p?.name)) errors.push(`${at}.name : texte attendu`);
    if (p?.label !== undefined && !isText(p.label)) errors.push(`${at}.label : texte attendu`);
    if (p?.global !== undefined && typeof p.global !== 'boolean') errors.push(`${at}.global : true ou false attendu`);

    if (p?.reversed !== undefined && typeof p.reversed !== 'boolean') errors.push(`${at}.reversed : true ou false attendu`);
    if (p?.ends !== undefined && !(isTextList(p.ends) && p.ends.length === 2)) errors.push(`${at}.ends : deux textes attendus`);

    if (p?.sequential !== undefined && !(p.type === 'stepped' && typeof p.sequential === 'boolean')) errors.push(`${at}.sequential : true ou false attendu, pour un paramètre "stepped"`);

    if (p?.type === 'stepped') {
        if (!isTextList(p.labels) || p.labels.length < 2) errors.push(`${at}.labels : au moins deux textes attendus`);
        else if (!Number.isInteger(p.min)) errors.push(`${at}.min : entier attendu`);
        else if (p.default !== undefined && !(Number.isInteger(p.default) && p.default >= p.min && p.default < p.min + p.labels.length)) {
            errors.push(`${at}.default : valeur d'un cran attendue`);
        }
    } else if (p?.type === 'toggle') {
        if (!(isTextList(p.labels) && p.labels.length === 2)) errors.push(`${at}.labels : deux textes attendus`);
        if (!(Array.isArray(p.values) && p.values.length === 2 && p.values.every(Number.isFinite) && p.values[0] !== p.values[1])) {
            errors.push(`${at}.values : deux nombres différents attendus`);
        }
        if (p.default !== undefined && p.default !== 0 && p.default !== 1) errors.push(`${at}.default : 0 ou 1 attendu`);
    } else if (p?.type === 'labeled') {
        if (!isTextList(p.labels)) {
            errors.push(`${at}.labels : liste de textes non vide attendue`);
        } else if (p.default !== undefined && !(Number.isInteger(p.default) && p.default >= 0 && p.default < p.labels.length)) {
            errors.push(`${at}.default : index de label attendu`);
        }
    } else if (p?.type === 'continuous') {
        if (!Number.isFinite(p.min) || !Number.isFinite(p.max) || p.min >= p.max) {
            errors.push(`${at} : min et max numériques attendus, avec min < max`);
        } else if (p.default !== undefined && !(Number.isFinite(p.default) && p.default >= p.min && p.default <= p.max)) {
            errors.push(`${at}.default : valeur entre min et max attendue`);
        }
        if (p.step !== undefined && !(Number.isFinite(p.step) && p.step > 0)) errors.push(`${at}.step : nombre positif attendu`);
    } else {
        errors.push(`${at}.type : "continuous", "stepped", "toggle" ou "labeled" attendu`);
    }
}

/** Renvoie la liste des erreurs du manifeste (vide s'il est valide). */
function validateManifest(manifest) {
    const errors = [];
    if (!isTextList(manifest?.sharedBanks)) errors.push('sharedBanks : liste de textes non vide attendue');
    if (!Array.isArray(manifest?.demos)) return [...errors, 'demos : liste attendue'];

    const ids = new Set();
    manifest.demos.forEach((demo, d) => {
        const at = `demos[${d}]`;
        if (!isText(demo?.id)) errors.push(`${at}.id : texte attendu`);
        else if (ids.has(demo.id)) errors.push(`${at}.id : « ${demo.id} » est utilisé deux fois`);
        else ids.add(demo.id);

        if (!isText(demo?.title)) errors.push(`${at}.title : texte attendu`);
        if (!isText(demo?.description)) errors.push(`${at}.description : texte attendu`);
        for (const field of ['name', 'project', 'image', 'observation']) if (demo?.[field] !== undefined && !isText(demo[field])) errors.push(`${at}.${field} : texte attendu`);
        if (demo?.steps !== undefined && !(Array.isArray(demo.steps) && demo.steps.every((step) => isText(step?.text) && ['play', 'param', 'move'].includes(step.when)))) {
            errors.push(`${at}.steps : liste de { text, when: "play", "param" ou "move" } attendue`);
        }
        // Liste vide si tout le contenu de la démo est déjà dans les shared banks.
        if (!Array.isArray(demo?.banks) || !demo.banks.every(isText)) errors.push(`${at}.banks : liste de textes attendue`);
        if (!Array.isArray(demo?.events) || demo.events.length === 0) {
            errors.push(`${at}.events : liste non vide attendue`);
            return;
        }

        demo.events.forEach((event, e) => {
            const atEvent = `${at}.events[${e}]`;
            if (!isText(event?.path)) errors.push(`${atEvent}.path : texte attendu`);
            if (!isText(event?.label)) errors.push(`${atEvent}.label : texte attendu`);
            if (!['oneshot', 'loop'].includes(event?.mode)) errors.push(`${atEvent}.mode : "oneshot" ou "loop" attendu`);
            if (event?.spatial !== undefined) {
                const { distance } = event.spatial ?? {};
                const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
                if (!isPair(distance) || distance[0] < 0 || distance[0] >= distance[1]) errors.push(`${atEvent}.spatial.distance : [min, max] attendu, avec min < max`);
            }
            if (event?.parameters === undefined) return;
            if (!Array.isArray(event.parameters)) errors.push(`${atEvent}.parameters : liste attendue`);
            else event.parameters.forEach((p, i) => validateParameter(p, `${atEvent}.parameters[${i}]`, errors));
        });
    });
    return errors;
}

async function loadManifest() {
    const response = await fetch('demos.json');
    if (!response.ok) throw new Error(`demos.json est introuvable (HTTP ${response.status}).`);

    let manifest;
    try {
        manifest = await response.json();
    } catch (cause) {
        throw new Error(`demos.json n'est pas un JSON valide : ${cause.message}`, { cause });
    }

    const errors = validateManifest(manifest);
    if (errors.length) throw new Error(`demos.json est mal formé :\n${errors.map((e) => `• ${e}`).join('\n')}`);
    return manifest;
}

const $ = (id) => document.getElementById(id);
const volume = $('master-volume');

const slots = new Map(); // event du manifeste → { button, demo, handle }
const values = new Map(); // paramètre du manifeste → valeur choisie
const displays = new Map(); // paramètre du manifeste → fonction qui ajoute sa valeur temps réel à sa courbe
const maps = new Map(); // event 3D du manifeste → vue de dessus
const sources = new Map(); // event 3D du manifeste → position { x, z } de la prochaine explosion ; le listener reste au centre
const CENTER = { x: 0, z: 0 };
let reports = new Map(); // démo → fonction qui fait avancer son protocole
let updateLamps = () => {};
let loading = null; // touche dont l'expérience se charge : les autres attendent

const isPlaying = (event) => Boolean(slots.get(event)?.handle);

/** Écrans des expériences : ils montrent le son qui sort vraiment du moteur. */
const scope = createScope({
    getNode: () => engine.outputNode,
    isBusy: () => [...slots.values()].some(({ handle }) => handle),
});
let manifest = null;

/** Clé du message d'erreur, et ses variables. */
function describe(error) {
    if (!(error instanceof EngineError)) return ['lab_error_unexpected'];
    if (error.code === 'missing-fmod') return ['lab_error_fmod'];
    if (error.code === 'missing-bank') return ['lab_error_bank'];
    if (error.code === 'bank-version') return ['lab_error_version'];
    return ['lab_error_other', { message: error.message }];
}

function reportError(error) {
    console.error(error);
    setStatus('error', ...describe(error));
}

/** Exécute une action du moteur et affiche l'erreur éventuelle. */
function attempt(action) {
    try {
        action();
    } catch (error) {
        reportError(error);
    }
}

let lockTimer = 0;
function showReady() {
    setStatus('ready', 'lab_status_ready');
    // Le contexte audio met un instant à redémarrer : on ne conclut au blocage qu'après ce délai.
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
        if (engine.isLocked) setStatus('locked', 'lab_status_locked');
    }, 500);
}

function showInactive() {
    clearTimeout(lockTimer);
    setStatus('idle', 'lab_status_idle');
}

/** Démarre le moteur au premier geste ; sans effet s'il est déjà prêt. */
async function ensureEngine() {
    if (engine.isReady) return;
    setStatus('loading', 'lab_status_starting');
    await engine.init({ sharedBanks: manifest.sharedBanks });
    showReady();
}

function applyParam(slot, param, value, options) {
    if (param.global) engine.setGlobalParam(param.name, value, options);
    else if (slot?.handle) engine.setParam(slot.handle, param.name, value, options);
}

/** Transmet aux courbes et aux cartes les valeurs temps réel des seuls events en cours de lecture. */
function showLiveValues() {
    for (const [event, slot] of slots) {
        const { handle } = slot;
        if (!handle) continue;
        if (event.spatial && !slot.hasRange) {
            const range = engine.getDistanceRange(handle);
            if (range) {
                slot.hasRange = true;
                maps.get(event).setRange(range);
            }
        }
        for (const param of event.parameters ?? []) {
            const show = displays.get(param);
            if (show) show(param.global ? engine.getGlobalParam(param.name) : engine.getParam(handle, param.name));
        }
    }
}

/** Pendant le chargement, la touche reste enfoncée et les autres touches de lecture ne répondent pas. */
async function load(slot) {
    loading = slot.button;
    setEventState(slot.button, 'loading');
    setBusy(slot.button);
    try {
        await ensureEngine();
        setStatus('loading', 'lab_status_connecting');
        await engine.loadBanks(slot.demo.banks);
    } finally {
        loading = null;
        setBusy(null);
        setEventState(slot.button, 'idle');
    }
}

async function start(slot, event) {
    await load(slot);
    stopEverything(); // un seul event à la fois
    const position = event.spatial && (sources.get(event) ?? CENTER);
    if (event.spatial) engine.setListener(CENTER);
    const handle = engine.play(event.path, {
        position,
        onStopped: () => {
            if (slot.handle !== handle) return;
            slot.handle = null;
            setLive(slot.demo, false);
            if (event.mode === 'loop') setEventPlaying(slot.button, false);
        },
    });
    slot.handle = handle;
    slot.hasRange = false; // relu à chaque lancement
    setLive(slot.demo, true);
    scope.start();
    maps.get(event)?.pulse();
    // Pour une explosion, l'étape peut demander qu'elle soit proche (below) ou loin (above) de l'oreille.
    reports.get(slot.demo)?.({ type: 'play', value: position ? Math.hypot(position.x, position.z) : undefined });
    if (event.mode === 'loop') setEventPlaying(slot.button, true);
    // Au départ, l'event prend directement la valeur choisie ; le seek ne joue que sur les changements suivants.
    for (const param of event.parameters ?? []) applyParam(slot, param, values.get(param), { immediate: true });
    showReady();
}

function stop(slot) {
    if (!slot.handle) return;
    const { handle } = slot;
    slot.handle = null;
    setLive(slot.demo, false);
    setEventPlaying(slot.button, false);
    engine.stop(handle, { fade: true });
}

function stopLoops(demo) {
    for (const [event, slot] of slots) {
        if (event.mode === 'loop' && (!demo || slot.demo === demo)) stop(slot);
    }
}

function stopEverything() {
    stopLoops();
    for (const slot of slots.values()) if (slot.handle) setLive(slot.demo, false);
    engine.stopAll({ fade: true });
}

async function onTrigger(button, demo, event) {
    const slot = slots.get(event) ?? { button, demo, handle: null };
    slots.set(event, slot);
    if (loading) return; // une expérience se charge déjà : on attend qu'elle soit prête

    try {
        if (event.mode === 'loop' && slot.handle) stop(slot);
        else await start(slot, event);
    } catch (error) {
        attempt(() => stop(slot)); // Un paramètre refusé ne doit pas laisser l'event jouer.
        const states = { 'missing-bank': 'missing', 'missing-fmod': 'idle', released: 'idle' };
        setEventState(button, states[error.code] ?? 'error');
        if (error.code !== 'released') reportError(error);
    }
}

function onParam(event, param, value, options) {
    values.set(param, value);
    attempt(() => applyParam(slots.get(event), param, value, options));
}

/** Un clic sur la vue de dessus : l'explosion partira de là. */
function onAim(event, position) {
    sources.set(event, position);
}

const sendVolume = perFrame((value) => attempt(() => engine.setMasterVolume(value)));
const showVolume = () => { $('master-volume-value').textContent = `${Math.round(volume.value * 100)} %`; };
volume.addEventListener('input', () => {
    showVolume();
    sendVolume(Number(volume.value));
});
// Le moteur part de la position du curseur (50 %), et non de son volume plein : il l'applique au démarrage.
showVolume();
engine.setMasterVolume(Number(volume.value));

// Safari peut exiger un second geste, car le téléchargement a consommé le premier.
document.addEventListener('click', () => {
    if (!engine.isLocked) return;
    engine.unlock();
    showReady();
});

engine.onUpdate = showLiveValues;
engine.onFailure = (error) => {
    showInactive();
    reportError(error);
};

async function main() {
    for (const link of document.querySelectorAll('a[href^="../index.html"]')) keepLanguage(link);
    showInactive();
    if (typeof WebAssembly !== 'object') {
        showPageError(getTranslation('lab_error_wasm') || 'WebAssembly ?');
        return;
    }
    manifest = await loadManifest();

    for (const event of manifest.demos.flatMap((demo) => demo.events)) {
        for (const param of event.parameters ?? []) {
            values.set(param, initialValue(param));
        }
    }

    updateLamps = renderLamps($('lamps'), $('lamps-count'), manifest.demos);
    const onDone = (demo) => {
        $(`demo-${demo.id}`).classList.add('is-tried');
        updateLamps();
    };
    const onStart = () => updateLamps(); // une première étape cochée : le voyant passe à l'orange
    const cards = renderDemos($('demos'), manifest.demos, { onTrigger, onParam, onAim, onDone, onStart, isPlaying, scope, displays, maps });
    reports = new Map([...cards.values()].map(({ demo, report }) => [demo, report]));
    updateLamps();
    watchCards(cards.keys(), (card) => attempt(() => stopLoops(cards.get(card).demo)));
    watchPage(engine, { onError: reportError, onReleased: showInactive });
}

main().catch((error) => {
    console.error(error);
    showPageError(error.message);
});
