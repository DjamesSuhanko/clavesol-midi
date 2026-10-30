/** Small local-only bridge; playback stays in the original upload/Manager flow. */
export function installMidiTestButton(start: (file: File) => Promise<void>, prepare: () => Promise<void>) {
    const button = document.querySelector<HTMLButtonElement>("#midi_test_button")!;
    const status = document.querySelector<HTMLElement>("#midi_test_status")!;
    button.disabled = false;
    button.addEventListener("click", async (event) => {
        event.stopPropagation();
        button.disabled = true;
        status.textContent = "Carregando música de teste…";
        try {
            // Resume Web Audio before the first network await, within the user gesture.
            await prepare();
            const metadata = await fetch("/clave-sol/midi-test");
            const info = (await metadata.json()) as { fileName?: string; relativePath?: string; error?: string };
            if (!metadata.ok || !info.fileName) throw new Error(info.error ?? "Não foi possível selecionar o MIDI.");
            const response = await fetch("/clave-sol/midi-test/file");
            if (!response.ok) throw new Error("Não foi possível ler o MIDI. Verifique a configuração e reinicie o servidor.");
            await start(new File([await response.arrayBuffer()], info.fileName, { type: "audio/midi" }));
            status.textContent = `Música carregada: ${info.relativePath ?? info.fileName}`;
        } catch (error) {
            status.textContent = error instanceof Error ? error.message : "Não foi possível carregar a música de teste.";
        } finally {
            button.disabled = false;
        }
    });
}
