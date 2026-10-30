/**
 * The available interface themes.
 * The colors live in css/themes/, one file per theme, keyed by the theme ID.
 * Keep this file import-free (server code imports it).
 */
export interface ThemeInfo {
    /**
     * The display name, shown untranslated like a locale name.
     */
    name: string;
    /**
     * Light themes disable the active note highlight, as it is hard to see on bright backgrounds.
     */
    type: "dark" | "light";
}

export const themeList = {
    // Both use a dark musical canvas; preserve native active-note highlighting.
    clavesol_dark: { name: "Clave Sol — Escuro", type: "dark" },
    clavesol_light: { name: "Clave Sol — Claro", type: "dark" },
    spessasynth_dark: { name: "SpessaSynth Dark", type: "dark" },
    spessasynth_light: { name: "SpessaSynth Light", type: "light" },
    teal: { name: "Teal", type: "dark" },
    purple: { name: "Purple", type: "dark" },
    orange: { name: "Orange", type: "dark" },
    dark_blue: { name: "Dark Blue", type: "dark" },
    dark_green: { name: "Dark Green", type: "dark" },
    grayscale: { name: "Grayscale", type: "dark" },
    pink: { name: "Pink", type: "light" },
    light_blue: { name: "Light Blue", type: "light" },
    light_green: { name: "Light Green", type: "light" },
    sepia: { name: "Sepia", type: "light" },
    ugly: { name: "Ugly", type: "light" }
} as const satisfies Record<string, ThemeInfo>;

export type ThemeID = keyof typeof themeList;

export const DEFAULT_THEME: ThemeID = "clavesol_light";
