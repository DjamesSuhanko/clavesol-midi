import { readSoundFont } from "./soundfont_download.ts";
import { staticMode, readStaticSettings, saveStaticSettings } from "./static_mode.ts";
import { installMidiLibrary } from "./midi_library.ts";
import { installMidiTestButton } from "./midi_test_button.ts";
import type { MIDIFile } from "../utils/drop_file_handler.ts";
import { Manager } from "../manager/manager.js";
import { LocaleManager } from "../manager/locale_manager.js";
import type { LocaleCode } from "../../locale/locale_list.ts";
import type { SavedSettings } from "../../../server/saved_settings.ts";
import { URLParamUtils } from "../utils/url_params.ts";
import { SpessaLog } from "spessasynth_core";

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        SPESSASYNTH_VERSION: string;
        manager?: Manager;
        saveSettings: (s: SavedSettings) => unknown;
        savedSettings: Promise<Partial<SavedSettings>>;
        isLocalEdition: boolean;
        rememberVoiceCap?: (cap: number) => unknown;
    }
}

/**
 * Local_main.js
 * purpose: main script for the local edition, loads the soundfont and passes it to the manager.js, reloads soundfonts when needed and saves the settings
 */

function showStartupError(error: unknown) {
    console.error("Falha ao inicializar o player:", error);
    const title = document.querySelector<HTMLElement>("#title");
    title?.removeAttribute("translate-path");
    if (title) title.textContent = "Não foi possível carregar a SoundFont ou iniciar o sintetizador. Verifique a conexão e recarregue a página.";
    document.querySelector("#progress_bar")?.classList.remove("active", "indeterminate");
}

async function withInitializationTimeout<T>(task: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([task, new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Tempo limite ao iniciar o sintetizador.")), 60_000);
        })]);
    } finally { clearTimeout(timer); }
}

async function initializePlayer() {
// Init params
/**
 * Saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 */
window.saveSettings = (settingsData: SavedSettings) => {
    if (staticMode) { saveStaticSettings(settingsData); return; }
    void fetch("/savesettings", {
        method: "POST",
        body: JSON.stringify(settingsData),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
};

/**
 * Reads the settings
 */
window.savedSettings = staticMode ? Promise.resolve(readStaticSettings()) : new Promise((resolve) => {
    void fetch("/getsettings").then((response) =>
        response.json().then((parsedSettings) => {
            resolve(parsedSettings as SavedSettings);
        })
    );
});

window.isLocalEdition = true;
SpessaLog.setLogLevel(true, true, true);
const titleMessage = document.querySelector<HTMLHeadingElement>("#title")!;
const progressBar = document.querySelector<HTMLDivElement>("#progress_bar")!;
const fileInput = document.querySelector<HTMLInputElement>("#midi_file_input")!;
const fileUpload = document.querySelector<HTMLLabelElement>("#file_upload")!;
const exportButton =
    document.querySelector<HTMLLabelElement>("#export_button")!;

// Remove the old files
fileInput.value = "";
// Hidden upload remains available to upstream code; do not focus it.

let synthReady = false;

// Load version
const v = await fetch(staticMode ? "version.txt" : "/getversion", { signal: AbortSignal.timeout(30_000) });
if (!v.ok) throw new Error(`Versão indisponível (HTTP ${v.status}).`);
window.SPESSASYNTH_VERSION = await v.text();

let soundBankBufferCurrent: ArrayBuffer | undefined = undefined;

let context: AudioContext;
const sampleRate = URLParamUtils.getSampleRate();
try {
    context = new AudioContext({ sampleRate });
} catch (error) {
    // Reload with a safe value if it isn't set
    if (sampleRate !== URLParamUtils.DEFAULT_SAMPLE_RATE) {
        URLParamUtils.setParam(
            URLParamUtils.SAMPLE_RATE,
            URLParamUtils.DEFAULT_SAMPLE_RATE.toString()
        );
    }
    throw error;
}

let titleString = "TITLE STRING";

async function fetchFont(fileName: string): Promise<ArrayBuffer> {
    const url = staticMode ? new URL(`soundfonts/${encodeURIComponent(fileName)}`, document.baseURI).href : fileName;
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    return await readSoundFont(response, (percent) => {
        progressBar.classList.toggle("indeterminate", percent === undefined);
        if (percent !== undefined) progressBar.style.setProperty("--progress", `${percent / 100}`);
    });
}

async function startMidi(midiFiles: FileList | File[]) {
    if (!synthReady || !window.manager) {
        throw new Error("O sintetizador ainda não está pronto. Recarregue a página se o erro persistir.");
    }
    const manager = window.manager;
    await manager.ready;
    let fName;
    fName =
        midiFiles[0].name.length > 20
            ? midiFiles[0].name.slice(0, 20) + "..."
            : midiFiles[0].name;
    if (midiFiles.length > 1) {
        fName += ` and ${midiFiles.length - 1} others`;
    }
    fileUpload.textContent = fName;
    fileUpload.title = midiFiles[0].name;
    const parsed: MIDIFile[] = [];
    for (const file of midiFiles) {
        parsed.push({
            binary: await file.arrayBuffer(),
            fileName: file.name
        });
    }

    titleMessage.style.fontStyle = "italic";
    manager.play(parsed);
    exportButton.style.display = "flex";
}

let initialization: Promise<void> | undefined;
const initManagerSF = () => initialization ??= initializeManagerSF();
const initializeManagerSF = async () => {
    if (!soundBankBufferCurrent) {
        return;
    }
    titleMessage.textContent = "Initializing...";
    progressBar.classList.add("active", "indeterminate");
    if (window.manager) {
        await withInitializationTimeout(window.manager.reloadSf(soundBankBufferCurrent));
    } else {
        window.manager = new Manager(
            context,
            soundBankBufferCurrent,
            localeManager,
            true
        );
        // Override temporarily
        titleMessage.textContent = "Initializing...";

        await withInitializationTimeout(window.manager.ready);
        // Disabled as of 20-11-2025 (firefox regression, lags a lot with console)
        window.manager.synth?.setLogLevel(false, false, false);
    }

    titleString = "Clave Sol MIDI — Biblioteca Musical";

    synthReady = true;
    titleMessage.textContent = titleString;
    progressBar.classList.remove("active", "indeterminate");
};

/**
 * Fetches and replaces the current manager's font
 */
async function replaceFont(fontName: string) {
    titleMessage.textContent = "Loading soundfont...";
    progressBar.style.setProperty("--progress", "0");
    progressBar.classList.add("active");
    soundBankBufferCurrent = await fetchFont(fontName);
    titleMessage.textContent = "Inicializando sintetizador…";
    // SoundFont parsing/initialization does not require audible autoplay.
    // The original Manager resumes audio on a later user gesture when required.
    initialization = undefined;
    await initManagerSF();
    synthReady = true;
    titleMessage.textContent = titleString;
}

const localeManager = new LocaleManager(
    navigator.language.split("-")[0].toLowerCase() as LocaleCode
);

// Load the list of soundfonts
const r = await fetch(staticMode ? "soundfonts.json" : "soundfonts", { signal: AbortSignal.timeout(30_000) });

if (!r.ok) {
    titleMessage.textContent = "Error fetching soundfonts!";
    throw new Error(r.statusText);
}
const sfSelector = document.querySelector<HTMLSelectElement>("#sf_selector")!;

const soundBanks: { name: string; size?: number }[] = JSON.parse(
    await r.text()
) as { name: string; size?: number }[];

if (!Array.isArray(soundBanks) || !soundBanks.length || soundBanks.some((sf) => typeof sf.name !== "string" || !sf.name)) {
    titleMessage.textContent = "No files in the 'soundfonts' folder!";
    throw new Error("No sound banks exist in the folder");
}

for (const sf of soundBanks) {
    const option = document.createElement("option");
    option.value = sf.name;
    let displayName = sf.name;
    if (displayName.length > 29) {
        displayName = displayName.slice(0, 30) + "...";
    }
    option.textContent = displayName;
    sfSelector.append(option);
}

sfSelector.addEventListener("change", async () => {
    sfSelector.blur();
    if (!staticMode) await fetch(`/setlastsf2?sfname=${encodeURIComponent(sfSelector.value)}`);
    if (window.manager?.seq?.midiData) {
        window.manager.seq.pause();
    }
    try { await replaceFont(sfSelector.value); }
    catch (error) { showStartupError(error); return; }
    titleMessage.textContent = window.manager?.seqUI?.currentSongTitle
        ? window.manager.seqUI?.currentSongTitle || titleString
        : titleString;

    if (window?.manager?.seq?.midiData) {
        window?.manager?.seqUI?.seqPlay?.();
    }
});

// Fetch the first sf2
await replaceFont(soundBanks[0].name);

// Start midi if already uploaded
if (fileInput.files?.[0]) {
    await startMidi(fileInput.files);
}

// And add the event listener
fileInput.addEventListener("change", async () => {
    if (!fileInput.files?.[0]) {
        return;
    }
    await startMidi(fileInput.files);
});

// Add export event listener
exportButton.addEventListener("click", () => {
    if ("manager" in window && window.manager instanceof Manager) {
        window.manager.showExportMenu();
    }
});

// Shared native loader/activation for the test button and sample library.
const loadExternalMidi = async (file: File) => { await startMidi([file]); };
const prepareExternalMidi = async () => {
    await context.resume();
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    document.onclick = null;
    if (!synthReady) {
        try { await initManagerSF(); }
        catch (error) { showStartupError(error); throw error; }
    }
};
installMidiTestButton(loadExternalMidi, prepareExternalMidi);
installMidiLibrary(loadExternalMidi, prepareExternalMidi);

}

void initializePlayer().catch(showStartupError);
