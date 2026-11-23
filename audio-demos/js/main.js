// Point d'entrée : lit le manifeste, le valide et construit l'UI.
import { EngineError, engine } from './fmod-engine.js';
import {
    perFrame, renderDemos, setEventPlaying, setEventState, setProgress, setStatus, showPageError,
} from './ui.js';
import { watchCards, watchPage } from './visibility.js';

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);

function validateParameter(p, at, errors) {
    if (!isText(p?.name)) errors.push(`${at}.name : texte attendu`);
    if (p?.label !== undefined && !isText(p.label)) errors.push(`${at}.label : texte attendu`);
    if (p?.global !== undefined && typeof p.global !== 'boolean') errors.push(`${at}.global : true ou false attendu`);

    if (p?.type === 'labeled') {
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
        errors.push(`${at}.type : "continuous" ou "labeled" attendu`);
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
const activate = $('activate');
const stopAll = $('stop-all');
const volume = $('master-volume');

const slots = new Map(); // event du manifeste → { button, demo, handle }
const values = new Map(); // paramètre du manifeste → valeur courante
let manifest = null;

function describe(error) {
    if (!(error instanceof EngineError)) return 'Erreur audio inattendue';
    if (error.code === 'missing-fmod') return 'Fichiers FMOD manquants';
    if (error.code === 'missing-bank') return 'Bank manquante';
    if (error.code === 'bank-version') return 'Bank incompatible avec la version du moteur FMOD';
    return `Erreur FMOD : ${error.message}`;
}

function reportError(error) {
    console.error(error);
    setStatus('error', describe(error));
}

/** Exécute une action du moteur et affiche l'erreur éventuelle. */
function attempt(action) {
    try {
        action();
    } catch (error) {
        reportError(error);
    }
}

function setControlsEnabled(enabled) {
    volume.disabled = !enabled;
    stopAll.disabled = !enabled;
}

let lockTimer = 0;
function showReady() {
    setStatus('ready', 'Audio prêt');
    // Le contexte audio met un instant à redémarrer : on ne conclut au blocage qu'après ce délai.
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
        if (engine.isLocked) setStatus('ready', 'Touchez la page pour activer le son');
    }, 500);
}

function showInactive() {
    clearTimeout(lockTimer);
    activate.disabled = false;
    activate.textContent = "Activer l'audio";
    setControlsEnabled(false);
    setStatus('idle', 'Audio inactif');
}

/** Démarre le moteur au premier geste ; sans effet s'il est déjà prêt. */
async function ensureEngine() {
    if (engine.isReady) return;
    activate.disabled = true;
    setProgress(0);
    setStatus('loading', 'Chargement du moteur audio…');
    try {
        await engine.init({ sharedBanks: manifest.sharedBanks, onProgress: setProgress });
    } catch (error) {
        activate.disabled = false;
        throw error;
    }
    activate.textContent = 'Audio activé';
    setControlsEnabled(true);
    showReady();
}

function applyParam(slot, param, value) {
    if (param.global) engine.setGlobalParam(param.name, value);
    else if (slot?.handle) engine.setParam(slot.handle, param.name, value);
}

async function start(slot, event) {
    setEventState(slot.button, 'loading');
    await ensureEngine();
    await engine.loadBanks(slot.demo.banks);
    setEventState(slot.button, 'idle');

    const handle = engine.play(event.path, {
        onStopped: () => {
            if (slot.handle !== handle) return;
            slot.handle = null;
            if (event.mode === 'loop') setEventPlaying(slot.button, false);
        },
    });
    slot.handle = handle;
    if (event.mode === 'loop') setEventPlaying(slot.button, true);
    for (const param of event.parameters ?? []) applyParam(slot, param, values.get(param));
    showReady();
}

function stop(slot) {
    if (!slot.handle) return;
    const { handle } = slot;
    slot.handle = null;
    setEventPlaying(slot.button, false);
    engine.stop(handle, { fade: true });
}

function stopLoops(demo) {
    for (const [event, slot] of slots) {
        if (event.mode === 'loop' && (!demo || slot.demo === demo)) stop(slot);
    }
}

async function onTrigger(button, demo, event) {
    const slot = slots.get(event) ?? { button, demo, handle: null };
    slots.set(event, slot);
    if (button.dataset.state === 'loading') return;

    try {
        if (event.mode === 'loop' && slot.handle) stop(slot);
        else await start(slot, event);
    } catch (error) {
        const states = { 'missing-bank': 'missing', 'missing-fmod': 'idle', released: 'idle' };
        setEventState(button, states[error.code] ?? 'error');
        if (error.code !== 'released') reportError(error);
    }
}

function onParam(event, param, value) {
    values.set(param, value);
    attempt(() => applyParam(slots.get(event), param, value));
}

activate.addEventListener('click', () => ensureEngine().catch(reportError));

stopAll.addEventListener('click', () => attempt(() => {
    stopLoops();
    engine.stopAll({ fade: true });
}));

const sendVolume = perFrame((value) => attempt(() => engine.setMasterVolume(value)));
volume.addEventListener('input', () => {
    $('master-volume-value').textContent = `${Math.round(volume.value * 100)} %`;
    sendVolume(Number(volume.value));
});

// Safari peut exiger un second geste, car le téléchargement a consommé le premier.
document.addEventListener('click', () => {
    if (!engine.isLocked) return;
    engine.unlock();
    showReady();
});

engine.onFailure = (error) => {
    showInactive();
    reportError(error);
};

async function main() {
    activate.disabled = true;
    if (typeof WebAssembly !== 'object') {
        showPageError('Votre navigateur ne prend pas en charge WebAssembly, nécessaire au moteur audio.');
        return;
    }
    manifest = await loadManifest();
    activate.disabled = false;

    for (const event of manifest.demos.flatMap((demo) => demo.events)) {
        for (const param of event.parameters ?? []) {
            values.set(param, param.default ?? (param.type === 'labeled' ? 0 : param.min));
        }
    }

    const cards = renderDemos($('demos'), manifest.demos, { onTrigger, onParam });
    watchCards(cards.keys(), (card) => attempt(() => stopLoops(cards.get(card))));
    watchPage(engine, { onError: reportError, onReleased: showInactive });
}

main().catch((error) => {
    console.error(error);
    showPageError(error.message);
});
