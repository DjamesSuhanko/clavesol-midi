/** Transport configuration only; the native player remains unchanged. */
import type { SavedSettings } from "../../../server/saved_settings.ts";
export const staticMode = document.documentElement.dataset.hosting === "static";
const SETTINGS_KEY = "clavesol-midi-settings";
export function readStaticSettings(): Partial<SavedSettings> {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<SavedSettings>;
    } catch { return {}; }
}
export function saveStaticSettings(settings: SavedSettings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch { console.warn("Preferências disponíveis apenas nesta sessão."); }
}
