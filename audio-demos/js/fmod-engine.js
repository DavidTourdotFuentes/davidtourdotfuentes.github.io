// Wrapper FMOD Studio : chargement paresseux, banks, instances et cycle de vie.
// Signatures vérifiées sur les exemples HTML5 du SDK 2.03.15 (api/studio/examples).

const FMOD_DIR = 'lib/fmod/';
const BANK_DIR = 'banks/';
const DSP_BUFFER_SIZE = 2048; // Le mixage tourne sur le thread principal : en dessous, risque de craquements.
const DSP_BUFFER_COUNT = 2;
const MAX_CHANNELS = 256;
const IDLE_DELAY_MS = 500; // Laisse finir les dernières traînes avant de suspendre le mixeur.

/** code : "missing-fmod", "missing-bank", "bank-version", "fmod" ou "released". */
export class EngineError extends Error {
    constructor(code, message, options) {
        super(message, options);
        this.code = code;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
            script.remove();
            reject(new EngineError('missing-fmod', `${src} est introuvable.`));
        };
        document.head.append(script);
    });
}

async function download(url, missingCode) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
    } catch (cause) {
        throw new EngineError(missingCode, `${url} n'a pas pu être téléchargé (${cause.message}).`, { cause });
    }
}

/** Attributs 3D à plat : x à droite, z vers l'avant, orientation fixe. */
function attributes3D({ x, z }) {
    return {
        position: { x, y: 0, z },
        velocity: { x: 0, y: 0, z: 0 },
        forward: { x: 0, y: 0, z: 1 },
        up: { x: 0, y: 1, z: 0 },
    };
}

class FmodEngine {
    #fmod = null;
    #studio = null;
    #core = null;
    #output = null;
    #sharedBanks = [];
    #ready = false;
    #initPromise = null;
    #banks = new Map(); // nom → { promise, bank }
    #handles = new Set();
    #frame = 0;
    #idleSince = 0;
    #hidden = false; // suspension demandée par la page (onglet caché)
    #mixing = false;
    #masterVolume = 1;

    /** Appelé si la boucle de mise à jour échoue ; le moteur est alors déjà libéré. */
    onFailure = null;

    /** Appelé après chaque mise à jour tant qu'au moins une instance joue. */
    onUpdate = null;

    get isReady() {
        return this.#ready;
    }

    /** true si le navigateur attend encore un geste pour laisser passer le son (Safari). */
    get isLocked() {
        return this.#ready && this.#mixing && this.#context?.state === 'suspended';
    }

    get #usesWorklet() {
        return this.#output === this.#fmod.OUTPUTTYPE_AUDIOWORKLET;
    }

    /** Contexte audio du runtime : propriété non documentée, donc accès facultatif. */
    get #context() {
        return this.#usesWorklet ? this.#fmod.mContext : this.#fmod.context;
    }

    /** À appeler dans un geste utilisateur. Réessayable après un échec. */
    init({ sharedBanks = [] } = {}) {
        this.#sharedBanks = sharedBanks;
        this.#initPromise ??= this.#init().catch((error) => {
            this.#initPromise = null;
            throw error;
        });
        return this.#initPromise;
    }

    async #init() {
        if (!this.#fmod) this.#fmod = await this.#loadRuntime();
        if (!this.#studio) this.#createSystem();
        for (const name of this.#sharedBanks) await this.#loadBank(name);

        this.#ready = true;
        this.#applyMasterVolume();
        this.#startMixer();
        this.unlock();
        this.#startLoop();
    }

    /**
     * Déverrouille la sortie audio. Le runtime ne crée son nœud de sortie que dans un gestionnaire
     * de clic installé par initialize() : sans cet appel, le premier clic resterait muet.
     * À rappeler dans un geste tant que isLocked est vrai.
     */
    unlock() {
        this.#fmod[this.#usesWorklet ? 'OutputAudioWorklet_resumeAudio' : 'OutputWebAudio_resumeAudio']?.();
        if (this.isLocked) this.#context.resume();
    }

    async #loadRuntime() {
        if (!globalThis.FMODModule) await loadScript(`${FMOD_DIR}fmodstudio.js`);
        const wasmBinary = await download(`${FMOD_DIR}fmodstudio.wasm`, 'missing-fmod');

        return new Promise((resolve, reject) => {
            const fmod = {
                wasmBinary,
                INITIAL_MEMORY: 64 * 1024 * 1024,
                onRuntimeInitialized: () => {
                    delete fmod.wasmBinary;
                    resolve(fmod);
                },
                onAbort: (reason) => reject(new EngineError('fmod', `Le moteur FMOD n'a pas démarré : ${reason}`)),
            };
            globalThis.FMODModule(fmod);
        });
    }

    #createSystem() {
        const FMOD = this.#fmod;
        const out = {};
        this.#check(FMOD.Studio_System_Create(out), 'Studio_System_Create');
        const studio = out.val;
        try {
            this.#check(studio.getCoreSystem(out), 'getCoreSystem');
            const core = out.val;
            this.#check(core.setDSPBufferSize(DSP_BUFFER_SIZE, DSP_BUFFER_COUNT), 'setDSPBufferSize');
            // Mixer à la fréquence de la sortie évite un rééchantillonnage.
            this.#check(core.getDriverInfo(0, null, null, out, null, null), 'getDriverInfo');
            this.#check(core.setSoftwareFormat(out.val, FMOD.SPEAKERMODE_DEFAULT, 0), 'setSoftwareFormat');
            this.#check(studio.initialize(MAX_CHANNELS, FMOD.STUDIO_INIT_NORMAL, FMOD.INIT_NORMAL, null), 'initialize');
            this.#check(core.getOutput(out), 'getOutput');
            this.#output = out.val;
            this.#studio = studio;
            this.#core = core;
            this.#mixing = true;
        } catch (error) {
            studio.release();
            throw error;
        }
    }

    async loadBanks(names) {
        await Promise.all(names.map((name) => this.#loadBank(name)));
    }

    unloadBanks(names) {
        for (const name of names) {
            if (this.#sharedBanks.includes(name)) continue;
            const entry = this.#banks.get(name);
            this.#banks.delete(name);
            if (entry?.bank) this.#check(entry.bank.unload(), `unload ${name}`);
        }
        this.#flush();
    }

    #loadBank(name) {
        const known = this.#banks.get(name);
        if (known) return known.promise;

        const entry = { promise: null, bank: null };
        entry.promise = this.#fetchBank(name, entry).catch((error) => {
            if (this.#banks.get(name) === entry) this.#banks.delete(name);
            throw error;
        });
        this.#banks.set(name, entry);
        return entry.promise;
    }

    async #fetchBank(name, entry) {
        const url = BANK_DIR + name.split('/').map(encodeURIComponent).join('/');
        const bytes = await download(url, 'missing-bank');
        if (!this.#studio || this.#banks.get(name) !== entry) {
            throw new EngineError('released', `Chargement de ${name} abandonné.`);
        }
        const FMOD = this.#fmod;
        const out = {};
        this.#check(
            this.#studio.loadBankMemory(bytes, bytes.length, FMOD.STUDIO_LOAD_MEMORY, FMOD.STUDIO_LOAD_BANK_NORMAL, out),
            `loadBankMemory ${name}`,
        );
        entry.bank = out.val;
    }

    /** Démarre un event. onStopped est appelé une fois, quand l'instance est vraiment finie. */
    play(eventPath, { onStopped, position } = {}) {
        const out = {};
        this.#check(this.#getEvent(eventPath).createInstance(out), `createInstance ${eventPath}`);
        const handle = { instance: out.val, path: eventPath, onStopped };
        try {
            if (position) this.#check(handle.instance.set3DAttributes(attributes3D(position)), `set3DAttributes ${eventPath}`);
            this.#check(handle.instance.start(), `start ${eventPath}`);
        } catch (error) {
            handle.instance.release();
            throw error;
        }
        this.#handles.add(handle);
        this.#startMixer();
        this.#startLoop();
        return handle;
    }

    #getEvent(eventPath) {
        if (!this.#ready) throw new EngineError('released', "Le moteur audio n'est pas prêt.");
        const out = {};
        this.#check(this.#studio.getEvent(eventPath, out), `getEvent ${eventPath}`);
        return out.val;
    }

    /**
     * Distances [min, max] d'atténuation appliquées à une instance, ou null si elle n'est pas encore prête.
     * Le spatializer peut remplacer celles de l'event (« Override Range ») : il est donc lu en premier.
     */
    getDistanceRange({ instance, path }) {
        const FMOD = this.#fmod;
        const group = {};
        if (instance.getChannelGroup(group) !== FMOD.OK) return null;

        const count = {};
        this.#check(group.val.getNumDSPs(count), `getNumDSPs ${path}`);
        for (let i = 0; i < count.val; i++) {
            const dsp = {};
            const type = {};
            this.#check(group.val.getDSP(i, dsp), `getDSP ${path}`);
            this.#check(dsp.val.getType(type), `getType ${path}`);
            if (type.val !== FMOD.DSP_TYPE_PAN) continue;
            const override = {};
            this.#check(dsp.val.getParameterBool(FMOD.DSP_PAN_OVERRIDE_RANGE, override, null), 'DSP_PAN_OVERRIDE_RANGE');
            if (override.val) {
                return [FMOD.DSP_PAN_3D_MIN_DISTANCE, FMOD.DSP_PAN_3D_MAX_DISTANCE].map((index) => {
                    const value = {};
                    this.#check(dsp.val.getParameterFloat(index, value, null), `DSP_PAN ${index}`);
                    return value.val;
                });
            }
        }

        const min = {};
        const max = {};
        this.#check(instance.getMinMaxDistance(min, max), `getMinMaxDistance ${path}`);
        return [min.val, max.val];
    }

    /** Position { x, z } de l'auditeur. Sans effet tant que le moteur n'est pas prêt. */
    setListener(position) {
        if (!this.#ready) return;
        this.#check(this.#studio.setListenerAttributes(0, attributes3D(position), null), 'setListenerAttributes');
        this.#flush();
    }

    stop(handle, { fade = true } = {}) {
        if (!this.#handles.has(handle)) return;
        const mode = fade ? this.#fmod.STUDIO_STOP_ALLOWFADEOUT : this.#fmod.STUDIO_STOP_IMMEDIATE;
        this.#check(handle.instance.stop(mode), `stop ${handle.path}`);
    }

    stopAll(options) {
        for (const handle of this.#handles) this.stop(handle, options);
    }

    /** immediate : ignore la vitesse de seek définie dans FMOD Studio. */
    setParam(handle, name, value, { immediate = false } = {}) {
        if (!this.#handles.has(handle)) return;
        this.#check(handle.instance.setParameterByName(name, value, immediate), `setParameterByName ${name}`);
    }

    setGlobalParam(name, value, { immediate = false } = {}) {
        if (!this.#ready) return;
        this.#check(this.#studio.setParameterByName(name, value, immediate), `setParameterByName ${name} (global)`);
        this.#flush();
    }

    /** Valeur temps réel d'un paramètre, seek et modulations compris. */
    getParam(handle, name) {
        return this.#readParam(handle.instance, name);
    }

    getGlobalParam(name) {
        return this.#readParam(this.#studio, name);
    }

    #readParam(source, name) {
        const value = {};
        const finalValue = {};
        this.#check(source.getParameterByName(name, value, finalValue), `getParameterByName ${name}`);
        return finalValue.val;
    }

    /** Volume linéaire de 0 à 1 sur le bus master. */
    setMasterVolume(value) {
        this.#masterVolume = value;
        if (!this.#ready) return;
        this.#applyMasterVolume();
        this.#flush();
    }

    #applyMasterVolume() {
        const out = {};
        this.#check(this.#studio.getBus('bus:/', out), 'getBus bus:/');
        this.#check(out.val.setVolume(this.#masterVolume), 'setVolume bus:/');
    }

    suspend() {
        this.#hidden = true;
        this.#stopLoop();
        this.#stopMixer();
    }

    resume() {
        this.#hidden = false;
        if (!this.#ready || this.#handles.size === 0) return;
        this.#startMixer();
        this.#startLoop();
    }

    /** Arrête tout et libère le système. init() peut être rappelé ensuite. */
    release() {
        this.#stopLoop();
        const handles = [...this.#handles];
        this.#handles.clear();
        this.#banks.clear();
        this.#ready = false;
        this.#initPromise = null;
        if (this.#studio) {
            for (const { instance } of handles) {
                instance.stop(this.#fmod.STUDIO_STOP_IMMEDIATE);
                instance.release();
            }
            const result = this.#studio.release();
            if (result !== this.#fmod.OK) console.error(`[FMOD] release : ${this.#fmod.ErrorString(result)}`);
        }
        this.#studio = null;
        this.#core = null;
        this.#mixing = false;
        for (const handle of handles) handle.onStopped?.();
    }

    // Le mixeur travaille en continu, même dans le silence : on le suspend dès que rien ne joue.
    #startMixer() {
        if (!this.#core || this.#mixing || this.#hidden) return;
        this.#check(this.#core.mixerResume(), 'mixerResume');
        this.#mixing = true;
    }

    #stopMixer() {
        if (!this.#core || !this.#mixing) return;
        this.#check(this.#core.mixerSuspend(), 'mixerSuspend');
        this.#mixing = false;
    }

    #startLoop() {
        this.#idleSince = 0;
        if (this.#frame || this.#hidden) return;
        const tick = (now) => {
            this.#frame = 0;
            try {
                this.#update();
            } catch (error) {
                this.release();
                this.onFailure?.(error);
                return;
            }
            if (this.#handles.size === 0) {
                this.#idleSince ||= now;
                if (now - this.#idleSince >= IDLE_DELAY_MS) {
                    this.#stopMixer();
                    return;
                }
            } else {
                this.#idleSince = 0;
            }
            this.#frame ||= requestAnimationFrame(tick);
        };
        this.#frame = requestAnimationFrame(tick);
    }

    #stopLoop() {
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
    }

    #update() {
        this.#check(this.#studio.update(), 'update');
        const out = {};
        for (const handle of [...this.#handles]) {
            const result = handle.instance.getPlaybackState(out);
            if (result === this.#fmod.OK && out.val !== this.#fmod.STUDIO_PLAYBACK_STOPPED) continue;
            this.#handles.delete(handle);
            handle.instance.release();
            handle.onStopped?.();
        }
        if (this.#handles.size) this.onUpdate?.();
    }

    /** Transmet les commandes en attente quand la boucle de mise à jour est arrêtée. */
    #flush() {
        if (this.#studio && !this.#frame) this.#check(this.#studio.update(), 'update');
    }

    #check(result, action) {
        if (result === this.#fmod.OK) return;
        const detail = this.#fmod.ErrorString(result);
        console.error(`[FMOD] ${action} : erreur ${result}, ${detail}`);
        const code = result === this.#fmod.ERR_VERSION ? 'bank-version' : 'fmod';
        throw new EngineError(code, `${action} a échoué (code ${result}).`, { cause: detail });
    }
}

export const engine = new FmodEngine();
