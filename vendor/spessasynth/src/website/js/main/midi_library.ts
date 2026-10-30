import { staticMode } from "./static_mode.ts";
const normalize = (value: string) => value.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "").toLowerCase();

interface Song {
    id: string;
    title: string;
    composer: string;
    fileName: string;
    url: string;
    downloadUrl: string;
    categoryId: string;
    categoryName: string;
    hierarchy?: string[];
}

export function installMidiLibrary(start: (file: File) => Promise<void>, prepare: () => Promise<void>) {
    const toggle = document.querySelector<HTMLButtonElement>("#library_toggle")!;
    const panel = document.querySelector<HTMLElement>("#midi_library")!;
    const close = document.querySelector<HTMLButtonElement>("#library_close")!;
    const search = document.querySelector<HTMLInputElement>("#library_search")!;
    const list = document.querySelector<HTMLElement>("#library_list")!;
    const count = document.querySelector<HTMLElement>("#library_count")!;
    const status = document.querySelector<HTMLElement>("#library_status")!;
    let songs: Song[] = [];
    let loaded = false;
    let loading = false;
    let busy = false;
    const expandedGroups = new Set<string>();
    function render() {
        list.replaceChildren();
        const query = normalize(search.value.trim());
        const visible = songs.filter((song) => normalize(`${song.title} ${song.composer}`).includes(query));
        count.textContent = `${visible.length} de ${songs.length} músicas`;
        const categoryTotals = new Map<string, number>();
        for (const song of songs) categoryTotals.set(song.categoryId, (categoryTotals.get(song.categoryId) ?? 0) + 1);
        const groups = new Map<string, HTMLUListElement>();
        function parentFor(song: Song) {
            let parent = list;
            const hierarchy = song.hierarchy?.length ? song.hierarchy : [song.composer];
            const labels = [song.categoryName, ...hierarchy];
            for (let depth = 0; depth < labels.length; depth++) {
                const key = JSON.stringify([song.categoryId, ...hierarchy.slice(0, depth)]);
                let children = groups.get(key);
                if (!children) {
                    const item = document.createElement("li");
                    item.className = "library_group";
                    const group = document.createElement("details");
                    const summary = document.createElement("summary");
                    summary.textContent = depth === 0 ? `${labels[depth]} (${categoryTotals.get(song.categoryId) ?? 0})` : labels[depth];
                    group.open = !!query || expandedGroups.has(key);
                    group.addEventListener("toggle", () => {
                        if (!query) {
                            if (group.open) expandedGroups.add(key);
                            else expandedGroups.delete(key);
                        }
                    });
                    children = document.createElement("ul");
                    group.append(summary, children);
                    item.append(group);
                    parent.append(item);
                    groups.set(key, children);
                }
                parent = children;
            }
            return parent;
        }
        for (const song of visible) {
            const row = document.createElement("li");
            const title = document.createElement("strong");
            title.textContent = song.title;
            const composer = document.createElement("span");
            composer.textContent = song.composer;
            const play = document.createElement("button");
            play.type = "button";
            play.textContent = "Ouvir";
            play.setAttribute("aria-label", `Ouvir ${song.title} — ${song.composer}`);
            play.disabled = busy;
            play.addEventListener("click", async () => {
                if (busy) return;
                busy = true;
                for (const button of list.querySelectorAll("button")) button.disabled = true;
                status.textContent = `Carregando ${song.title}…`;
                try {
                    await prepare();
                    const response = await fetch(song.url);
                    if (!response.ok) throw new Error("MIDI indisponível. Verifique a fonte configurada.");
                    await start(new File([await response.arrayBuffer()], song.fileName, { type: "audio/midi" }));
                    status.textContent = `Carregada: ${song.title} — ${song.composer}. Use os controles do player para reproduzir ou pausar.`;
                } catch (error) {
                    status.textContent = error instanceof Error ? error.message : "Não foi possível carregar o MIDI.";
                } finally {
                    busy = false;
                    for (const button of list.querySelectorAll("button")) button.disabled = false;
                }
            });
            const download = document.createElement("a");
            download.href = song.downloadUrl;
            download.download = song.fileName;
            download.textContent = "Baixar MIDI";
            download.setAttribute("aria-label", `Baixar MIDI ${song.title} — ${song.composer}`);
            row.append(title, composer, play, download);
            parentFor(song).append(row);
        }
    }
    function hide() {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    }
    panel.addEventListener("click", (event) => event.stopPropagation());
    // Typing/searching must not trigger the player's keyboard shortcuts.
    panel.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Escape") hide();
    });
    panel.addEventListener("keyup", (event) => event.stopPropagation());
    close.addEventListener("click", hide);
    search.addEventListener("input", render);
    toggle.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (!panel.hidden) { hide(); return; }
        panel.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        search.focus();
        if (loaded || loading) return;
        loading = true;
        status.textContent = "Carregando biblioteca…";
        try {
            const response = await fetch(staticMode ? "library.json" : "/clave-sol/library");
            if (!response.ok) {
                const error = (await response.json()) as { error?: string };
                throw new Error(error.error ?? "Biblioteca indisponível.");
            }
            songs = (await response.json()) as Song[];
            loaded = true;
            status.textContent = "";
            render();
        } catch (error) {
            status.textContent = error instanceof Error ? error.message : "Biblioteca indisponível.";
        } finally { loading = false; }
    });
}
