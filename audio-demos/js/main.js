// Point d'entrée : lit le manifeste, le valide et construit l'UI.
import { renderDemos, setEventState, setStatus, showPageError } from './ui.js';

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);

function validateParameter(p, at, errors) {
    if (!isText(p?.name)) errors.push(`${at}.name : texte attendu`);
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
        if (!isTextList(demo?.banks)) errors.push(`${at}.banks : liste de textes non vide attendue`);
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

const activate = document.getElementById('activate');

if (typeof WebAssembly !== 'object') {
    activate.disabled = true;
    showPageError('Votre navigateur ne prend pas en charge WebAssembly, nécessaire au moteur audio.');
}

// TODO étape 3 : remplacer ces deux réactions par les appels à fmod-engine.js.
activate.addEventListener('click', () => setStatus('error', 'Fichiers FMOD manquants'));
const onTrigger = (button) => setEventState(button, 'missing');

loadManifest()
    .then((manifest) => renderDemos(document.getElementById('demos'), manifest.demos, { onTrigger }))
    .catch((error) => {
        console.error(error);
        showPageError(error.message);
    });
